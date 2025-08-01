/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Notification types
export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  VENDOR_PAYOUT_PROCESSED = 'VENDOR_PAYOUT_PROCESSED',
  VENDOR_APPLICATION_SUBMITTED = 'VENDOR_APPLICATION_SUBMITTED',
  VENDOR_APPLICATION_APPROVED = 'VENDOR_APPLICATION_APPROVED',
  VENDOR_APPLICATION_REJECTED = 'VENDOR_APPLICATION_REJECTED',
  VENDOR_APPLICATION_STATUS_UPDATED = 'VENDOR_APPLICATION_STATUS_UPDATED',
}

// Notification channels
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

// Notification priority
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Notification schema
export const CreateNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1),
  message: z.string().min(1),
  channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
  metadata: z.record(z.string(), z.any()).optional(),
  scheduledFor: z.date().optional(),
});

export type CreateNotificationRequest = z.infer<typeof CreateNotificationSchema>;

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  metadata?: any;
  isRead: boolean;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new notification
 */
export async function createNotification(
  request: CreateNotificationRequest,
): Promise<Notification> {
  const validatedRequest = CreateNotificationSchema.parse(request);

  const notification = await prisma.notification.create({
    data: {
      userId: validatedRequest.userId,
      type: validatedRequest.type,
      title: validatedRequest.title,
      message: validatedRequest.message,
      channels: validatedRequest.channels,
      priority: validatedRequest.priority,
      metadata: validatedRequest.metadata,
      scheduledFor: validatedRequest.scheduledFor,
      isRead: false,
    },
  });

  return notification as Notification;
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(
  orderId: string,
  newStatus: OrderStatus,
  previousStatus?: OrderStatus,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      store: { select: { name: true } },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const notificationConfig = getOrderStatusNotificationConfig(newStatus, previousStatus);

  if (!notificationConfig) {
    return; // No notification needed for this status change
  }

  await createNotification({
    userId: order.customer.id,
    type: notificationConfig.type,
    title: notificationConfig.title(order.store.name),
    message: notificationConfig.message(order.store.name, order.id),
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: notificationConfig.priority,
    metadata: {
      orderId: order.id,
      orderStatus: newStatus,
      previousStatus,
      storeName: order.store.name,
      orderTotal: order.total,
    },
  });
}

/**
 * Send payment notification
 */
export async function sendPaymentNotification(
  orderId: string,
  paymentStatus: PaymentStatus,
  amount: number,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      store: { select: { name: true } },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const notificationConfig = getPaymentNotificationConfig(paymentStatus);

  if (!notificationConfig) {
    return;
  }

  await createNotification({
    userId: order.customer.id,
    type: notificationConfig.type,
    title: notificationConfig.title,
    message: notificationConfig.message(order.store.name, amount),
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: notificationConfig.priority,
    metadata: {
      orderId: order.id,
      paymentStatus,
      amount,
      storeName: order.store.name,
    },
  });
}

/**
 * Send vendor payout notification
 */
export async function sendVendorPayoutNotification(
  vendorId: string,
  payoutId: string,
  amount: number,
  status: string,
): Promise<void> {
  const vendor = await prisma.user.findUnique({
    where: { id: vendorId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const notificationConfig = getVendorPayoutNotificationConfig(status);

  if (!notificationConfig) {
    return;
  }

  await createNotification({
    userId: vendor.id,
    type: notificationConfig.type,
    title: notificationConfig.title,
    message: notificationConfig.message(amount),
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: notificationConfig.priority,
    metadata: {
      payoutId,
      amount,
      status,
    },
  });
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false,
): Promise<{
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: notifications as Notification[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Delete old notifications (cleanup)
 */
export async function cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true, // Only delete read notifications
    },
  });

  return result.count;
}

// Helper functions for notification configuration
function getOrderStatusNotificationConfig(
  newStatus: OrderStatus,
  _previousStatus?: OrderStatus,
): {
  type: NotificationType;
  title: (storeName: string) => string;
  message: (storeName: string, orderId: string) => string;
  priority: NotificationPriority;
} | null {
  switch (newStatus) {
    case 'PROCESSING':
      return {
        type: NotificationType.ORDER_STATUS_UPDATED,
        title: (storeName: string) => `Order Processing - ${storeName}`,
        message: (storeName: string, orderId: string) =>
          `Your order #${orderId} from ${storeName} is now being processed. We'll notify you when it ships.`,
        priority: NotificationPriority.MEDIUM,
      };
    case 'SHIPPED':
      return {
        type: NotificationType.ORDER_SHIPPED,
        title: (storeName: string) => `Order Shipped - ${storeName}`,
        message: (storeName: string, orderId: string) =>
          `Great news! Your order #${orderId} from ${storeName} has been shipped and is on its way to you.`,
        priority: NotificationPriority.HIGH,
      };
    case 'DELIVERED':
      return {
        type: NotificationType.ORDER_DELIVERED,
        title: (storeName: string) => `Order Delivered - ${storeName}`,
        message: (storeName: string, orderId: string) =>
          `Your order #${orderId} from ${storeName} has been delivered! Enjoy your purchase.`,
        priority: NotificationPriority.HIGH,
      };
    case 'CANCELLED':
      return {
        type: NotificationType.ORDER_CANCELLED,
        title: (storeName: string) => `Order Cancelled - ${storeName}`,
        message: (storeName: string, orderId: string) =>
          `Your order #${orderId} from ${storeName} has been cancelled. Any refunds will be processed within 3-5 business days.`,
        priority: NotificationPriority.HIGH,
      };
    default:
      return null;
  }
}

function getPaymentNotificationConfig(paymentStatus: PaymentStatus): {
  type: NotificationType;
  title: string;
  message: (storeName: string, amount: number) => string;
  priority: NotificationPriority;
} | null {
  switch (paymentStatus) {
    case 'PAID':
      return {
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment Successful',
        message: (storeName: string, amount: number) =>
          `Payment of ₦${(amount / 100).toFixed(2)} for your order from ${storeName} has been received successfully.`,
        priority: NotificationPriority.HIGH,
      };
    case 'FAILED':
      return {
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed',
        message: (storeName: string, amount: number) =>
          `Payment of ₦${(amount / 100).toFixed(2)} for your order from ${storeName} failed. Please try again or contact support.`,
        priority: NotificationPriority.URGENT,
      };
    case 'REFUNDED':
      return {
        type: NotificationType.PAYMENT_REFUNDED,
        title: 'Payment Refunded',
        message: (storeName: string, amount: number) =>
          `A refund of ₦${(amount / 100).toFixed(2)} for your order from ${storeName} has been processed.`,
        priority: NotificationPriority.MEDIUM,
      };
    default:
      return null;
  }
}

function getVendorPayoutNotificationConfig(status: string): {
  type: NotificationType;
  title: string;
  message: (amount: number) => string;
  priority: NotificationPriority;
} | null {
  switch (status) {
    case 'COMPLETED':
      return {
        type: NotificationType.VENDOR_PAYOUT_PROCESSED,
        title: 'Payout Completed',
        message: (amount: number) =>
          `Your payout of ₦${(amount / 100).toFixed(2)} has been processed and sent to your account.`,
        priority: NotificationPriority.HIGH,
      };
    case 'FAILED':
      return {
        type: NotificationType.VENDOR_PAYOUT_PROCESSED,
        title: 'Payout Failed',
        message: (amount: number) =>
          `Your payout of ₦${(amount / 100).toFixed(2)} failed. Please check your account details and try again.`,
        priority: NotificationPriority.URGENT,
      };
    default:
      return null;
  }
}
