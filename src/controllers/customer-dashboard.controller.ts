/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getCustomerDashboard,
  getOrderTracking,
  getCustomerAnalytics,
  getCustomerPreferences,
  CustomerDashboardQuery,
  OrderTrackingQuery,
} from '../services/customer-dashboard.service';

/**
 * Get customer dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const query = CustomerDashboardQuery.parse(req.query);

    const dashboardStats = await getCustomerDashboard(customerId, query);

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      data: dashboardStats,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get dashboard statistics',
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
 * Get detailed order tracking information
 */
export async function getOrderTrackingDetails(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;

    const query = OrderTrackingQuery.parse({ orderId });
    const trackingDetails = await getOrderTracking(customerId, query);

    res.json({
      message: 'Order tracking details retrieved successfully',
      data: trackingDetails,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get order tracking details',
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
 * Get customer analytics
 */
export async function getCustomerAnalyticsData(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const days = parseInt(req.query.days as string) || 30;

    const analytics = await getCustomerAnalytics(customerId, days);

    res.json({
      message: 'Customer analytics retrieved successfully',
      data: analytics,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get customer analytics',
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
 * Get customer preferences and recommendations
 */
export async function getCustomerPreferencesData(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;

    const preferences = await getCustomerPreferences(customerId);

    res.json({
      message: 'Customer preferences retrieved successfully',
      data: preferences,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get customer preferences',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
