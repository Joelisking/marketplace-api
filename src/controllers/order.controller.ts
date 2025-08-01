/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  createOrder,
  getOrderById,
  getCustomerOrders,
  getVendorOrders,
  updateOrderStatus,
  cancelOrder,
  getVendorOrderStats,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
} from '../services/order.service';
import { prisma } from '../lib/prisma';
import { OrderListQuery } from '../schema/order';
import { CustomerOrderQuery } from '../schema/customer';

/**
 * Create order from cart (checkout)
 */
export async function checkoutOrder(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const body = CreateOrderSchema.parse(req.body);

    const order = await createOrder(customerId, body);

    res.json({
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to create order',
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
 * Get customer orders
 */
export async function getCustomerOrderHistory(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const parsedQuery = CustomerOrderQuery.parse(req.query);

    // Transform the parsed query to match the service expectations
    const query = {
      page: parsedQuery.page || 1,
      limit: parsedQuery.limit || 20,
      status: parsedQuery.status,
    };

    const result = await getCustomerOrders(customerId, query);

    res.json(result);
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
 * Get specific order details
 */
export async function getOrderDetails(req: Request, res: Response) {
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
      order,
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
 * Get vendor orders
 */
export async function getVendorOrderList(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user.id;
    const parsedQuery = OrderListQuery.parse(req.query);

    // Transform the parsed query to match the service expectations
    const query = {
      page: parsedQuery.page || 1,
      limit: parsedQuery.limit || 20,
      status: parsedQuery.status,
      startDate: parsedQuery.startDate,
      endDate: parsedQuery.endDate,
    };

    // Get vendor's store ID
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { storeId: true },
    });

    if (!user?.storeId) {
      return res.status(403).json({
        message: 'Vendor store not found',
      });
    }

    const result = await getVendorOrders(user.storeId, query);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get vendor orders',
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
 * Get specific vendor order details
 */
export async function getVendorOrderDetails(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user.id;
    const { orderId } = req.params;

    // Get vendor's store ID
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { storeId: true },
    });

    if (!user?.storeId) {
      return res.status(403).json({
        message: 'Vendor store not found',
      });
    }

    const order = await getOrderById(orderId);

    // Ensure vendor can only access orders from their store
    if (order.storeId !== user.storeId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    res.json({
      order,
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
 * Update order status (vendor only)
 */
export async function updateVendorOrderStatus(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user.id;
    const { orderId } = req.params;
    const body = UpdateOrderStatusSchema.parse(req.body);

    // Get vendor's store ID
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { storeId: true },
    });

    if (!user?.storeId) {
      return res.status(403).json({
        message: 'Vendor store not found',
      });
    }

    // Verify order belongs to vendor's store
    const order = await getOrderById(orderId);
    if (order.storeId !== user.storeId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    const updatedOrder = await updateOrderStatus(orderId, body);

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to update order status',
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
 * Get vendor order statistics
 */
export async function getVendorOrderStatistics(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user.id;
    const { days = 30 } = req.query;

    // Get vendor's store ID
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { storeId: true },
    });

    if (!user?.storeId) {
      return res.status(403).json({
        message: 'Vendor store not found',
      });
    }

    const stats = await getVendorOrderStats(user.storeId, Number(days));

    res.json(stats);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get order statistics',
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
 * Cancel order (customer only)
 */
export async function cancelCustomerOrder(req: Request, res: Response) {
  try {
    const customerId = (req as any).user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await getOrderById(orderId);

    // Ensure customer can only cancel their own orders
    if (order.customerId !== customerId) {
      return res.status(403).json({
        message: 'Access denied',
      });
    }

    const cancelledOrder = await cancelOrder(orderId, reason || 'Cancelled by customer');

    res.json({
      message: 'Order cancelled successfully',
      order: cancelledOrder,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to cancel order',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
