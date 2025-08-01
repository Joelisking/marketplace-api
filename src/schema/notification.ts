import { z } from 'zod';

// Notification response
export const NotificationResponse = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  metadata: z.record(z.any(), z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

// Notification list response
export const NotificationListResponse = z.object({
  message: z.string(),
  data: z.object({
    notifications: z.array(NotificationResponse),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  }),
});

// Mark notification as read request
export const MarkNotificationReadRequest = z.object({
  notificationId: z.string(),
});

// Mark notification as read response
export const MarkNotificationReadResponse = z.object({
  message: z.string(),
  data: z.object({
    notification: NotificationResponse,
  }),
});

// Mark all notifications as read response
export const MarkAllNotificationsReadResponse = z.object({
  message: z.string(),
  data: z.object({
    updatedCount: z.number(),
  }),
});

// Unread count response
export const UnreadCountResponse = z.object({
  message: z.string(),
  data: z.object({
    unreadCount: z.number(),
  }),
});

// Error response
export const NotificationErrorResponse = z.object({
  message: z.string(),
  error: z.string().optional(),
});

// Notification ID parameter
export const NotificationIdParam = z.object({
  notificationId: z.string().describe('Notification ID'),
});
