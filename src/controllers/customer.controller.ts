/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getCustomerOrders as getCustomerOrdersService,
  getOrderById,
} from '../services/order.service';
import { getOrderTracking as getOrderTrackingService } from '../services/customer-dashboard.service';

/**
 * Get customer orders (enhanced version with better UX)
 */
export async function getCustomerOrders(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const result = await getCustomerOrdersService(customerId, {
      page,
      limit,
      status: status as any,
    });

    res.json({
      message: 'Orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get orders',
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
 * Get specific customer order details
 */
export async function getCustomerOrderDetails(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;

    const order = await getOrderById(orderId);

    // Ensure customer can only access their own orders
    if (order.customerId !== customerId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    res.json({
      message: 'Order details retrieved successfully',
      data: { order },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get order details',
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
 * Get order tracking details
 */
export async function getOrderTracking(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;

    const trackingDetails = await getOrderTrackingService(customerId, { orderId });

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
 * Get simple customer statistics (for profile page)
 */
export async function getCustomerStats(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;

    // Get basic order stats using existing service
    const orders = await getCustomerOrdersService(customerId, { page: 1, limit: 100 });

    const totalOrders = orders.pagination.total;
    const totalSpent = orders.orders.reduce((sum: number, order: any) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    res.json({
      message: 'Customer statistics retrieved successfully',
      data: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        ordersThisMonth: orders.orders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          const now = new Date();
          return (
            orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()
          );
        }).length,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get customer statistics',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
