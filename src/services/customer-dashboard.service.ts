/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const CustomerDashboardQuery = z.object({
  days: z.number().int().positive().max(365).default(30),
});

export const OrderTrackingQuery = z.object({
  orderId: z.string().min(1),
});

export type CustomerDashboardRequest = z.infer<typeof CustomerDashboardQuery>;
export type OrderTrackingRequest = z.infer<typeof OrderTrackingQuery>;

// Customer dashboard statistics
export interface CustomerDashboardStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  spendingThisMonth: number;
  favoriteStores: Array<{
    storeId: string;
    storeName: string;
    orderCount: number;
    totalSpent: number;
  }>;
  recentActivity: Array<{
    type: 'order_created' | 'order_delivered' | 'payment_made';
    orderId: string;
    storeName: string;
    amount: number;
    date: Date;
  }>;
  orderStatusBreakdown: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}

// Order tracking details
export interface OrderTrackingDetails {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  trackingEvents: Array<{
    eventType: string;
    description: string;
    timestamp: Date;
    metadata?: any;
  }>;
  currentLocation?: string;
  deliveryUpdates: Array<{
    status: string;
    location?: string;
    timestamp: Date;
    description: string;
  }>;
}

/**
 * Get comprehensive customer dashboard statistics
 */
export async function getCustomerDashboard(
  customerId: string,
  request: CustomerDashboardRequest,
): Promise<CustomerDashboardStats> {
  CustomerDashboardQuery.parse(request); // Validate request
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Get all customer orders
  const [allOrders, monthOrders, favoriteStores, recentActivity] = await Promise.all([
    // All orders for total stats
    prisma.order.findMany({
      where: { customerId },
      include: {
        store: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true } } } },
        orderEvents: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // This month's orders
    prisma.order.findMany({
      where: {
        customerId,
        createdAt: { gte: monthStart },
      },
    }),

    // Favorite stores (most ordered from)
    prisma.order.groupBy({
      by: ['storeId'],
      where: { customerId },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),

    // Recent activity (last 10 events)
    prisma.orderEvent.findMany({
      where: { order: { customerId } },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            store: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Calculate statistics
  const totalOrders = allOrders.length;
  const totalSpent = allOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const ordersThisMonth = monthOrders.length;
  const spendingThisMonth = monthOrders.reduce((sum, order) => sum + order.total, 0);

  // Get store names for favorite stores
  const storeIds = favoriteStores.map((store) => store.storeId);
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });

  const favoriteStoresWithNames = favoriteStores.map((store) => {
    const storeInfo = stores.find((s) => s.id === store.storeId);
    return {
      storeId: store.storeId,
      storeName: storeInfo?.name || 'Unknown Store',
      orderCount: store._count.id,
      totalSpent: store._sum.total || 0,
    };
  });

  // Process recent activity
  const processedActivity = recentActivity.map((event) => {
    let type: 'order_created' | 'order_delivered' | 'payment_made';
    switch (event.eventType) {
      case 'ORDER_CREATED':
        type = 'order_created';
        break;
      case 'ORDER_DELIVERED':
        type = 'order_delivered';
        break;
      case 'PAYMENT_RECEIVED':
        type = 'payment_made';
        break;
      default:
        type = 'order_created';
    }

    return {
      type,
      orderId: event.order.id,
      storeName: event.order.store.name,
      amount: event.order.total,
      date: event.createdAt,
    };
  });

  // Order status breakdown
  const orderStatusBreakdown = {
    pending: allOrders.filter((order) => order.status === 'PENDING').length,
    processing: allOrders.filter((order) => order.status === 'PROCESSING').length,
    shipped: allOrders.filter((order) => order.status === 'SHIPPED').length,
    delivered: allOrders.filter((order) => order.status === 'DELIVERED').length,
    cancelled: allOrders.filter((order) => order.status === 'CANCELLED').length,
  };

  return {
    totalOrders,
    totalSpent,
    averageOrderValue,
    ordersThisMonth,
    spendingThisMonth,
    favoriteStores: favoriteStoresWithNames,
    recentActivity: processedActivity,
    orderStatusBreakdown,
  };
}

/**
 * Get detailed order tracking information
 */
export async function getOrderTracking(
  customerId: string,
  request: OrderTrackingRequest,
): Promise<OrderTrackingDetails> {
  const { orderId } = OrderTrackingQuery.parse(request);

  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      store: { select: { name: true } },
      orderEvents: {
        orderBy: { createdAt: 'asc' },
        include: { order: { select: { total: true, store: { select: { name: true } } } } },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Process tracking events
  const trackingEvents = order.orderEvents.map((event) => ({
    eventType: event.eventType,
    description: event.description,
    timestamp: event.createdAt,
    metadata: event.metadata,
  }));

  // Generate delivery updates based on order events
  const deliveryUpdates = order.orderEvents
    .filter((event) =>
      ['ORDER_PROCESSING', 'ORDER_SHIPPED', 'ORDER_DELIVERED'].includes(event.eventType),
    )
    .map((event) => {
      let status: string;
      let location: string | undefined;
      let description: string;

      switch (event.eventType) {
        case 'ORDER_PROCESSING':
          status = 'Processing';
          description = 'Your order is being prepared';
          break;
        case 'ORDER_SHIPPED':
          status = 'Shipped';
          location = 'In Transit';
          description = 'Your order is on its way';
          break;
        case 'ORDER_DELIVERED':
          status = 'Delivered';
          location = 'Delivered';
          description = 'Your order has been delivered';
          break;
        default:
          status = 'Unknown';
          description = event.description;
      }

      return {
        status,
        location,
        timestamp: event.createdAt,
        description,
      };
    });

  // Determine current location based on latest event
  const latestEvent = order.orderEvents[order.orderEvents.length - 1];
  let currentLocation: string | undefined;

  if (latestEvent) {
    switch (latestEvent.eventType) {
      case 'ORDER_CREATED':
        currentLocation = 'Order Placed';
        break;
      case 'ORDER_PROCESSING':
        currentLocation = 'Being Prepared';
        break;
      case 'ORDER_SHIPPED':
        currentLocation = 'In Transit';
        break;
      case 'ORDER_DELIVERED':
        currentLocation = 'Delivered';
        break;
      case 'ORDER_CANCELLED':
        currentLocation = 'Cancelled';
        break;
    }
  }

  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    estimatedDelivery: order.estimatedDelivery || undefined,
    deliveredAt: order.deliveredAt || undefined,
    trackingEvents,
    currentLocation,
    deliveryUpdates,
  };
}

/**
 * Get customer order analytics
 */
export async function getCustomerAnalytics(customerId: string, days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orderTrends, spendingTrends, categoryBreakdown] = await Promise.all([
    // Order trends over time
    prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        customerId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Spending trends over time
    prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        customerId,
        createdAt: { gte: startDate },
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Category breakdown (based on product categories if available)
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          customerId,
          createdAt: { gte: startDate },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    orderTrends: orderTrends.map((trend) => ({
      date: trend.createdAt,
      orderCount: trend._count.id,
    })),
    spendingTrends: spendingTrends.map((trend) => ({
      date: trend.createdAt,
      amount: trend._sum.total || 0,
    })),
    categoryBreakdown,
  };
}

/**
 * Get customer preferences and recommendations
 */
export async function getCustomerPreferences(customerId: string) {
  // Get customer's order history to analyze preferences
  const orderHistory = await prisma.order.findMany({
    where: { customerId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              store: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Analyze spending patterns
  const totalSpent = orderHistory.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = orderHistory.length > 0 ? totalSpent / orderHistory.length : 0;

  // Get frequently ordered products
  const productFrequency = new Map<string, { product: any; count: number; totalSpent: number }>();

  orderHistory.forEach((order) => {
    order.items.forEach((item) => {
      const productId = item.product.id;
      const existing = productFrequency.get(productId);

      if (existing) {
        existing.count += item.quantity;
        existing.totalSpent += item.total;
      } else {
        productFrequency.set(productId, {
          product: item.product,
          count: item.quantity,
          totalSpent: item.total,
        });
      }
    });
  });

  const favoriteProducts = Array.from(productFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get preferred stores
  const storeFrequency = new Map<
    string,
    { storeName: string; orderCount: number; totalSpent: number }
  >();

  orderHistory.forEach((order) => {
    const storeName = order.items[0]?.product.store.name || 'Unknown';
    const existing = storeFrequency.get(storeName);

    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += order.total;
    } else {
      storeFrequency.set(storeName, {
        storeName,
        orderCount: 1,
        totalSpent: order.total,
      });
    }
  });

  const preferredStores = Array.from(storeFrequency.values())
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 3);

  return {
    totalSpent,
    averageOrderValue,
    favoriteProducts,
    preferredStores,
    orderCount: orderHistory.length,
  };
}
