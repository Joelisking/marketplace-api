/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../services/notification.service';

/**
 * Get user notifications
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await getUserNotifications(userId, page, limit, unreadOnly);

    res.json({
      message: 'Notifications retrieved successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get notifications',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { notificationId } = req.params;

    await markNotificationAsRead(notificationId, userId);

    res.json({
      message: 'Notification marked as read successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to mark notification as read',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    await markAllNotificationsAsRead(userId);

    res.json({
      message: 'All notifications marked as read successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to mark notifications as read',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    const count = await getUnreadNotificationCount(userId);

    res.json({
      message: 'Unread notification count retrieved successfully',
      data: { count },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get unread notification count',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
