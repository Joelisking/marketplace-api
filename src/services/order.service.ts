/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import {
  validateCartForCheckout,
  reserveInventoryForCheckout,
  releaseInventory,
} from './cart.service';

const prisma = new PrismaClient();

// Validation schemas
export const CreateOrderSchema = z.object({
  storeId: z.string().min(1),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().default('Nigeria'),
  }),
  billingAddress: z
    .object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().default('Nigeria'),
    })
    .optional(),
  notes: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().optional(),
});

export const GetOrdersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: z.enum(OrderStatus).optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusSchema>;
export type GetOrdersRequest = z.infer<typeof GetOrdersSchema>;

// Order with full details
export interface OrderWithDetails {
  id: string;
  customerId: string;
  storeId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  currency: string;
  notes?: string;
  shippingAddress?: any;
  billingAddress?: any;
  paymentReference?: string;
  paymentProvider?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt?: Date;
  customer: {
    id: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    slug: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      imageUrl: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    provider: string;
    reference: string;
    status: PaymentStatus;
    createdAt: Date;
  }>;
}

/**
 * Create order from cart with transaction safety
 */
export async function createOrder(
  customerId: string,
  request: CreateOrderRequest,
): Promise<OrderWithDetails> {
  const validatedRequest = CreateOrderSchema.parse(request);

  // Validate cart for checkout
  const cartValidation = await validateCartForCheckout(customerId);
  if (!cartValidation.isValid) {
    throw new Error(`Cart validation failed: ${cartValidation.errors.join(', ')}`);
  }

  const { cartSummary } = cartValidation;

  // Use transaction to ensure data consistency
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        customerId,
        storeId: validatedRequest.storeId,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        total: cartSummary.total,
        subtotal: cartSummary.subtotal,
        tax: cartSummary.estimatedTax,
        shipping: cartSummary.estimatedShipping,
        discount: 0,
        currency: 'NGN',
        notes: validatedRequest.notes,
        shippingAddress: validatedRequest.shippingAddress,
        billingAddress: validatedRequest.billingAddress || validatedRequest.shippingAddress,
      },
    });

    // Create order items
    await Promise.all(
      cartSummary.items.map((item) =>
        tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
          },
        }),
      ),
    );

    return newOrder;
  });

  // Reserve inventory (outside transaction to avoid deadlocks)
  await reserveInventoryForCheckout(customerId, order.id);

  // Return full order details
  return getOrderById(order.id);
}

/**
 * Get order by ID with full details
 */
export async function getOrderById(orderId: string): Promise<OrderWithDetails> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return order as OrderWithDetails;
}

/**
 * Get customer orders with pagination and filtering
 */
export async function getCustomerOrders(
  customerId: string,
  request: GetOrdersRequest,
): Promise<{
  orders: OrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { page, limit, status, startDate, endDate } = GetOrdersSchema.parse(request);

  // Build where clause
  const where: any = { customerId };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Get total count
  const total = await prisma.order.count({ where });

  // Get orders
  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    orders: orders as OrderWithDetails[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get vendor orders with filtering
 */
export async function getVendorOrders(
  storeId: string,
  request: GetOrdersRequest,
): Promise<{
  orders: OrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { page, limit, status, startDate, endDate } = GetOrdersSchema.parse(request);

  // Build where clause
  const where: any = { storeId };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Get total count
  const total = await prisma.order.count({ where });

  // Get orders
  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    orders: orders as OrderWithDetails[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update order status with validation
 */
export async function updateOrderStatus(
  orderId: string,
  request: UpdateOrderStatusRequest,
): Promise<OrderWithDetails> {
  const { status, reason } = UpdateOrderStatusSchema.parse(request);

  // Get current order
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!currentOrder) {
    throw new Error('Order not found');
  }

  // Validate status transition
  const validTransitions = getValidStatusTransitions(currentOrder.status);
  if (!validTransitions.includes(status)) {
    throw new Error(`Invalid status transition from ${currentOrder.status} to ${status}`);
  }

  // Update order status
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'CANCELLED' && {
          cancelledAt: new Date(),
          cancelReason: reason,
        }),
      },
    });
  });

  return getOrderById(orderId);
}

/**
 * Get valid status transitions
 */
function getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [], // Final state
    CANCELLED: [], // Final state
    REFUNDED: [], // Final state
    CONFIRMED: ['PROCESSING', 'CANCELLED'], // Add CONFIRMED status
  };

  return transitions[currentStatus] || [];
}

/**
 * Cancel order and release inventory
 */
export async function cancelOrder(orderId: string, reason: string): Promise<OrderWithDetails> {
  const order = await getOrderById(orderId);

  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw new Error('Cannot cancel order in current status');
  }

  // Update status to cancelled
  await updateOrderStatus(orderId, { status: 'CANCELLED', reason });

  // Release inventory if payment was not made
  if (order.paymentStatus === 'UNPAID') {
    await releaseInventory(orderId);
  }

  return getOrderById(orderId);
}

/**
 * Get order statistics for vendor
 */
export async function getVendorOrderStats(storeId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await prisma.order.groupBy({
    by: ['status'],
    where: {
      storeId,
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      total: true,
    },
  });

  const totalOrders = stats.reduce((sum, stat) => sum + stat._count.id, 0);
  const totalRevenue = stats.reduce((sum, stat) => sum + (stat._sum.total || 0), 0);

  return {
    period: `${days} days`,
    totalOrders,
    totalRevenue,
    byStatus: stats.map((stat) => ({
      status: stat.status,
      count: stat._count.id,
      revenue: stat._sum.total || 0,
    })),
  };
}
