/**
 * SMS Service using Arkesel
 * Adapted from electragh project
 */

import { logger } from '../utils/logger';

export interface SmsProvider {
  sendSms(to: string, message: string, type: string): Promise<SmsResult>;
  verifyOtp?(to: string, code: string): Promise<boolean>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Arkesel SMS provider implementation
class ArkeselSmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private generateUrl: string;
  private verifyUrl: string;
  private sandbox: boolean;
  public lastGeneratedOtp?: string;

  constructor(apiKey: string, senderId: string, sandbox: boolean = false) {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.sandbox = sandbox;
    this.generateUrl = 'https://sms.arkesel.com/api/otp/generate';
    this.verifyUrl = 'https://sms.arkesel.com/api/otp/verify';
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      // Check if this is an OTP message
      const isOtpMessage =
        type === 'OTP_CODE' ||
        message.includes('%otp_code%') ||
        /\d{4,6}/.test(message);

      if (isOtpMessage) {
        logger.info(`Sending OTP via Arkesel OTP API for ${to}`);

        const payload = {
          number: formattedPhone,
          sender_id: this.senderId,
          message: message.replace(/\d{4,6}/, '%otp_code%'),
          type: 'numeric',
          length: 6,
          expiry: 5, // 5 minutes
          medium: 'sms',
        };

        const response = await fetch(this.generateUrl, {
          method: 'POST',
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        logger.info(
          `Arkesel OTP response: ${response.status} - ${responseText}`
        );

        if (!response.ok) {
          throw new Error(
            `Arkesel OTP API error: ${response.status} ${responseText}`
          );
        }

        const data = JSON.parse(responseText);

        if (
          data.code === '1000' ||
          data.status === 'success' ||
          data.success === true
        ) {
          return {
            success: true,
            messageId:
              data.ussd_code ||
              data.messageId ||
              `arkesel_otp_${Date.now()}`,
          };
        } else if (
          data.code === '1007' ||
          data.message?.includes('Insufficient balance')
        ) {
          // Fallback to regular SMS with our own generated OTP
          logger.warn(`OTP API insufficient balance, falling back to SMS`);

          const otpMatch = message.match(/\d{6}/);
          const generatedOtp = otpMatch ? otpMatch[0] : null;

          if (generatedOtp) {
            this.lastGeneratedOtp = generatedOtp;
          }

          return await this.sendRegularSms(formattedPhone, message);
        } else {
          throw new Error(
            `Arkesel OTP API error: ${
              data.message || data.error || 'Unknown error'
            }`
          );
        }
      } else {
        return await this.sendRegularSms(formattedPhone, message);
      }
    } catch (error) {
      logger.error('Arkesel SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendRegularSms(
    phone: string,
    message: string
  ): Promise<SmsResult> {
    const payload = {
      sender: this.senderId,
      message: message,
      recipients: [phone],
    };

    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Arkesel SMS API error: ${response.status} ${errorData}`
      );
    }

    const data = await response.json();

    if (
      data.code === '1000' ||
      data.status === 'success' ||
      data.success === true
    ) {
      return {
        success: true,
        messageId:
          data.data?.[0]?.id || data.messageId || `arkesel_${Date.now()}`,
      };
    } else {
      throw new Error(
        `Arkesel SMS API error: ${
          data.message || data.error || 'Unknown error'
        }`
      );
    }
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      if (this.sandbox) {
        logger.warn('Sandbox mode - skipping API verification');
        return false;
      }

      const payload = {
        number: formattedPhone,
        code: code,
      };

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      const successCodes = ['1000', '1100'];
      return successCodes.includes(data.code) || data.status === 'success';
    } catch (error) {
      logger.error('Arkesel OTP verification error:', error);
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('233')) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (!cleaned.startsWith('233')) {
      cleaned = `233${cleaned}`;
    }

    return cleaned;
  }
}

// Mock SMS provider for development
class MockSmsProvider implements SmsProvider {
  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    logger.info(`[MOCK SMS] To: ${to}, Type: ${type}`);
    logger.info(`[MOCK SMS] Message: ${message}`);

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random()}`,
    };
  }
}

// SMS Service class
class SmsService {
  private provider: SmsProvider;
  private generatedOtps: Map<string, { code: string; timestamp: number }> =
    new Map();

  constructor(provider: SmsProvider) {
    this.provider = provider;
  }

  async sendOtp(to: string, code: string, userName?: string): Promise<SmsResult> {
    const message = userName
      ? `Hello ${userName},\n\nYour verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nMarketplace Team`
      : `Your verification code is: ${code}\n\nThis code expires in 5 minutes.`;

    const result = await this.provider.sendSms(to, message, 'OTP_CODE');

    if (
      result.success &&
      this.provider instanceof ArkeselSmsProvider
    ) {
      const arkeselProvider = this.provider as any;
      if (arkeselProvider.lastGeneratedOtp) {
        this.generatedOtps.set(to, {
          code: arkeselProvider.lastGeneratedOtp,
          timestamp: Date.now(),
        });
        this.cleanupOldOtps();
      }
    }

    return result;
  }

  async sendOrderNotification(
    to: string,
    orderId: string,
    status: string
  ): Promise<SmsResult> {
    const message = `Your order ${orderId} has been ${status}. Track your order at [APP_URL]`;
    return await this.provider.sendSms(to, message, 'ORDER_NOTIFICATION');
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    // Try provider verification first
    if (typeof this.provider.verifyOtp === 'function') {
      const providerResult = await this.provider.verifyOtp(to, code);
      if (providerResult) {
        return true;
      }
    }

    // Fallback to local verification
    const storedOtp = this.generatedOtps.get(to);
    if (storedOtp) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (
        storedOtp.timestamp > fiveMinutesAgo &&
        storedOtp.code === code
      ) {
        this.generatedOtps.delete(to);
        return true;
      } else if (storedOtp.timestamp <= fiveMinutesAgo) {
        this.generatedOtps.delete(to);
      }
    }

    return false;
  }

  private cleanupOldOtps(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [phone, otpData] of this.generatedOtps.entries()) {
      if (otpData.timestamp <= fiveMinutesAgo) {
        this.generatedOtps.delete(phone);
      }
    }
  }
}

// Factory function
export function createSmsService(): SmsService {
  const provider = process.env.SMS_PROVIDER || 'mock';

  let smsProvider: SmsProvider;

  switch (provider) {
    case 'arkesel':
      if (!process.env.ARKESEL_API_KEY) {
        logger.warn('Arkesel API key not configured, using mock provider');
        smsProvider = new MockSmsProvider();
      } else {
        smsProvider = new ArkeselSmsProvider(
          process.env.ARKESEL_API_KEY,
          process.env.ARKESEL_SENDER_ID || 'MERCHANT',
          process.env.ARKESEL_SANDBOX === 'true'
        );
      }
      break;
    case 'mock':
    default:
      smsProvider = new MockSmsProvider();
      break;
  }

  return new SmsService(smsProvider);
}

// Export singleton instance
export const smsService = createSmsService();
