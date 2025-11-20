/**
 * Email Service using Resend
 * Provides email sending functionality for OTP and notifications
 */

import { logger } from '../utils/logger';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<EmailResult>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Resend Email Provider
class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        logger.info(`Email sent successfully to ${to}`);
        return {
          success: true,
          messageId: data.id,
        };
      } else {
        logger.error(`Resend API error:`, data);
        return {
          success: false,
          error: data.message || 'Failed to send email',
        };
      }
    } catch (error) {
      logger.error('Email sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Mock Email Provider for development
class MockEmailProvider implements EmailProvider {
  async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResult> {
    logger.info(`[MOCK EMAIL] To: ${to}`);
    logger.info(`[MOCK EMAIL] Subject: ${subject}`);
    logger.info(`[MOCK EMAIL] HTML: ${html.substring(0, 100)}...`);

    return {
      success: true,
      messageId: `mock_email_${Date.now()}`,
    };
  }
}

// Email Service class
class EmailService {
  private provider: EmailProvider;

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  async sendOtpEmail(
    to: string,
    code: string,
    userName?: string
  ): Promise<EmailResult> {
    const subject = 'Your Verification Code';
    const html = this.generateOtpEmailTemplate(code, userName);

    return await this.provider.sendEmail(to, subject, html);
  }

  async sendWelcomeEmail(
    to: string,
    userName: string
  ): Promise<EmailResult> {
    const subject = 'Welcome to Marketplace!';
    const html = this.generateWelcomeEmailTemplate(userName);

    return await this.provider.sendEmail(to, subject, html);
  }

  async sendOrderConfirmation(
    to: string,
    orderData: {
      orderId: string;
      userName: string;
      total: number;
      items: Array<{ name: string; quantity: number; price: number }>;
    }
  ): Promise<EmailResult> {
    const subject = `Order Confirmation - ${orderData.orderId}`;
    const html = this.generateOrderConfirmationTemplate(orderData);

    return await this.provider.sendEmail(to, subject, html);
  }

  async sendOrderStatusUpdate(
    to: string,
    orderId: string,
    status: string,
    userName: string
  ): Promise<EmailResult> {
    const subject = `Order Update - ${orderId}`;
    const html = this.generateOrderStatusTemplate(orderId, status, userName);

    return await this.provider.sendEmail(to, subject, html);
  }

  async sendPayoutNotification(
    to: string,
    amount: number,
    storeName: string
  ): Promise<EmailResult> {
    const subject = 'Payout Processed';
    const html = this.generatePayoutTemplate(amount, storeName);

    return await this.provider.sendEmail(to, subject, html);
  }

  private generateOtpEmailTemplate(code: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Verification Code</h1>
          ${userName ? `<p>Hello ${userName},</p>` : '<p>Hello,</p>'}
          <p>Your verification code is:</p>
          <div style="background-color: #fff; padding: 20px; margin: 20px 0; text-align: center; border-radius: 5px; border: 2px dashed #3498db;">
            <h2 style="color: #3498db; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h2>
          </div>
          <p>This code will expire in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Marketplace! 🎉</h1>
          <p>Hello ${userName},</p>
          <p>Thank you for joining our marketplace! Your account has been successfully created.</p>
          <p>You can now:</p>
          <ul>
            <li>Browse thousands of products</li>
            <li>Create your own store and start selling</li>
            <li>Track your orders in real-time</li>
            <li>Chat with buyers and sellers</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Shopping
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Need help? Contact our support team anytime.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderConfirmationTemplate(orderData: {
    orderId: string;
    userName: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }): string {
    const itemsHtml = orderData.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">GHS ${(item.price / 100).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Order Confirmed! ✓</h1>
          <p>Hello ${orderData.userName},</p>
          <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
          <div style="background-color: #fff; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Order ID:</strong> ${orderData.orderId}</p>
            <table style="width: 100%; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f8f8f8;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr>
                  <td colspan="2" style="padding: 15px; text-align: right;"><strong>Total:</strong></td>
                  <td style="padding: 15px; text-align: right;"><strong>GHS ${(orderData.total / 100).toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderData.orderId}"
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Track Order
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderStatusTemplate(
    orderId: string,
    status: string,
    userName: string
  ): string {
    const statusMessages: Record<string, string> = {
      PROCESSING: 'Your order is being prepared',
      SHIPPED: 'Your order has been shipped',
      DELIVERED: 'Your order has been delivered',
      CANCELLED: 'Your order has been cancelled',
    };

    const message = statusMessages[status] || `Order status: ${status}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Order Update</h1>
          <p>Hello ${userName},</p>
          <p>${message}</p>
          <div style="background-color: #fff; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Status:</strong> ${status}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}"
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Order
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePayoutTemplate(amount: number, storeName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payout Processed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2c3e50; margin-bottom: 20px;">Payout Processed 💰</h1>
          <p>Hello ${storeName},</p>
          <p>Your payout has been successfully processed!</p>
          <div style="background-color: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <p style="font-size: 18px; margin: 0;">Amount</p>
            <p style="font-size: 36px; color: #27ae60; font-weight: bold; margin: 10px 0;">GHS ${(amount / 100).toFixed(2)}</p>
          </div>
          <p>The funds will be transferred to your registered bank account within 1-2 business days.</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Factory function
export function createEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER || 'mock';

  let emailProvider: EmailProvider;

  switch (provider) {
    case 'resend':
      if (!process.env.RESEND_API_KEY) {
        logger.warn('Resend API key not configured, using mock provider');
        emailProvider = new MockEmailProvider();
      } else {
        emailProvider = new ResendEmailProvider(
          process.env.RESEND_API_KEY,
          process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        );
      }
      break;
    case 'mock':
    default:
      emailProvider = new MockEmailProvider();
      break;
  }

  return new EmailService(emailProvider);
}

// Export singleton instance
export const emailService = createEmailService();
