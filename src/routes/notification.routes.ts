import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { authGuard } from '../middlewares/auth';
import { registry } from '../lib/openapi';
import {
  NotificationListResponse,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  UnreadCountResponse,
  NotificationErrorResponse,
  NotificationIdParam,
} from '../schema/notification';

// OpenAPI registration for notification endpoints
registry.registerPath({
  method: 'get',
  path: '/notifications',
  tags: ['notifications'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Notifications retrieved successfully',
      content: {
        'application/json': {
          schema: NotificationListResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: NotificationErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/notifications/{notificationId}/read',
  tags: ['notifications'],
  security: [{ bearerAuth: [] }],
  request: {
    params: NotificationIdParam,
  },
  responses: {
    200: {
      description: 'Notification marked as read successfully',
      content: {
        'application/json': {
          schema: MarkNotificationReadResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: NotificationErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'Notification not found',
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/notifications/read-all',
  tags: ['notifications'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'All notifications marked as read successfully',
      content: {
        'application/json': {
          schema: MarkAllNotificationsReadResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: NotificationErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/notifications/unread-count',
  tags: ['notifications'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Unread notification count retrieved successfully',
      content: {
        'application/json': {
          schema: UnreadCountResponse,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: NotificationErrorResponse,
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
  },
});

const router = Router();

// Notification routes
router.get('/notifications', authGuard, ctrl.getNotifications);
router.patch('/notifications/:notificationId/read', authGuard, ctrl.markNotificationRead);
router.patch('/notifications/read-all', authGuard, ctrl.markAllNotificationsRead);
router.get('/notifications/unread-count', authGuard, ctrl.getUnreadCount);

export default router;
