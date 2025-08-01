import { prisma } from '../lib/prisma';
import { z } from 'zod';
import {
  VendorAnalyticsQuery,
  VendorPerformanceQuery,
  VendorAnalyticsResponse,
  VendorPerformanceMetrics,
} from '../schema/vendor';

/**
 * Get comprehensive vendor analytics
 */
export async function getVendorAnalytics(
  vendorId: string,
  query: z.infer<typeof VendorAnalyticsQuery>,
): Promise<z.infer<typeof VendorAnalyticsResponse>> {
  const { period, startDate, endDate } = VendorAnalyticsQuery.parse(query);

  // Calculate date range
  const now = new Date();
  let start: Date;
  let end: Date = now;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        start = new Date(0);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Get vendor's store
  const store = await prisma.store.findFirst({
    where: { owner: { id: vendorId } },
  });

  if (!store) {
    throw new Error('Store not found');
  }

  // Get all analytics data in parallel
  const [revenueData, orderData, productData, customerData, performanceData, previousPeriodData] =
    await Promise.all([
      // Revenue analytics
      getRevenueAnalytics(store.id, start, end),

      // Order analytics
      getOrderAnalytics(store.id, start, end),

      // Product analytics
      getProductAnalytics(store.id, start, end),

      // Customer analytics
      getCustomerAnalytics(store.id, start, end),

      // Performance metrics
      getPerformanceMetrics(store.id, start, end),

      // Previous period data for growth calculation
      getPreviousPeriodData(store.id, start, end),
    ]);

  // Calculate growth rates
  const revenueGrowth =
    previousPeriodData.revenue > 0
      ? ((revenueData.total - previousPeriodData.revenue) / previousPeriodData.revenue) * 100
      : 0;

  const orderGrowth =
    previousPeriodData.orders > 0
      ? ((orderData.total - previousPeriodData.orders) / previousPeriodData.orders) * 100
      : 0;

  return {
    period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
    revenue: {
      total: revenueData.total,
      average: revenueData.average,
      growth: revenueGrowth,
      byDay: revenueData.byDay,
    },
    orders: {
      total: orderData.total,
      average: orderData.average,
      growth: orderGrowth,
      byStatus: orderData.byStatus,
    },
    products: productData,
    customers: customerData,
    performance: performanceData,
  };
}

/**
 * Get vendor performance metrics
 */
export async function getVendorPerformance(
  vendorId: string,
  query: z.infer<typeof VendorPerformanceQuery>,
): Promise<z.infer<typeof VendorPerformanceMetrics>> {
  const { days } = VendorPerformanceQuery.parse(query);

  const store = await prisma.store.findFirst({
    where: { owner: { id: vendorId } },
  });

  if (!store) {
    throw new Error('Store not found');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get performance data
  const [orderStats, fulfillmentData, customerSatisfaction, topProducts, performanceTrends] =
    await Promise.all([
      // Order statistics
      getOrderStatistics(store.id, startDate),

      // Fulfillment metrics
      getFulfillmentMetrics(store.id, startDate),

      // Customer satisfaction
      getCustomerSatisfaction(store.id, startDate),

      // Top performing products
      getTopProducts(store.id, startDate),

      // Performance trends
      getPerformanceTrends(store.id, startDate),
    ]);

  return {
    fulfillmentRate: fulfillmentData.fulfillmentRate,
    averageFulfillmentTime: fulfillmentData.averageTime,
    customerSatisfaction: customerSatisfaction.averageRating,
    orderAccuracy: fulfillmentData.accuracy,
    responseTime: fulfillmentData.responseTime,
    totalOrders: orderStats.total,
    completedOrders: orderStats.completed,
    cancelledOrders: orderStats.cancelled,
    refundRate: orderStats.refundRate,
    averageOrderValue: orderStats.averageValue,
    topProducts,
    performanceTrends,
  };
}

/**
 * Get vendor metrics with daily sales counts
 */
export async function getVendorMetrics(
  vendorId: string,
  query: { days?: number; startDate?: string; endDate?: string },
): Promise<{
  period: string;
  totalOrders: number;
  totalRevenue: number;
  byStatus: Array<{ status: string; count: number; revenue: number }>;
  dailySales: Array<{ date: string; orders: number; revenue: number }>;
}> {
  const { days = 30, startDate, endDate } = query;

  // Calculate date range
  const now = new Date();
  let start: Date;
  let end: Date = now;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // Get vendor's store
  const store = await prisma.store.findFirst({
    where: { owner: { id: vendorId } },
  });

  if (!store) {
    throw new Error('Store not found');
  }

  // Get daily sales data
  const dailySales = await prisma.$queryRaw<
    Array<{ date: string; orders: number; revenue: number }>
  >`
    SELECT 
      DATE(o."createdAt") as date,
      COUNT(o.id) as orders,
      COALESCE(SUM(o.total), 0) as revenue
    FROM "Order" o
    WHERE o."storeId" = ${store.id}
      AND o."createdAt" >= ${start}
      AND o."createdAt" <= ${end}
      AND o."paymentStatus" = 'PAID'
    GROUP BY DATE(o."createdAt")
    ORDER BY date ASC
  `;

  // Get status breakdown
  const statusBreakdown = await prisma.order.groupBy({
    by: ['status'],
    where: {
      storeId: store.id,
      createdAt: { gte: start, lte: end },
    },
    _count: { id: true },
    _sum: { total: true },
  });

  // Calculate totals
  const totalOrders = dailySales.reduce((sum, day) => sum + day.orders, 0);
  const totalRevenue = dailySales.reduce((sum, day) => sum + day.revenue, 0);

  return {
    period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
    totalOrders,
    totalRevenue,
    byStatus: statusBreakdown.map((item) => ({
      status: item.status,
      count: item._count.id,
      revenue: item._sum.total || 0,
    })),
    dailySales,
  };
}

// Helper functions for analytics calculations

async function getRevenueAnalytics(storeId: string, start: Date, end: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      paymentStatus: 'PAID',
      createdAt: { gte: start, lte: end },
    },
    select: {
      total: true,
      createdAt: true,
    },
  });

  const total = orders.reduce((sum, order) => sum + order.total, 0);
  const average = orders.length > 0 ? total / orders.length : 0;

  // Group by day
  const byDay = orders.reduce(
    (acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + order.total;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total,
    average,
    byDay: Object.entries(byDay).map(([date, amount]) => ({ date, amount })),
  };
}

async function getOrderAnalytics(storeId: string, start: Date, end: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: start, lte: end },
    },
    select: {
      status: true,
      total: true,
    },
  });

  const total = orders.length;
  const average = total > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / total : 0;

  // Group by status
  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: (count / total) * 100,
  }));

  return {
    total,
    average,
    byStatus,
  };
}

async function getProductAnalytics(storeId: string, start: Date, end: Date) {
  const [products, bestSellers] = await Promise.all([
    // Product counts
    prisma.product.groupBy({
      by: ['isActive', 'visibleMarket', 'stock'],
      where: { storeId },
      _count: { id: true },
    }),

    // Best selling products
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        product: { storeId },
        order: {
          paymentStatus: 'PAID',
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  // Calculate product statistics
  let total = 0,
    active = 0,
    lowStock = 0,
    outOfStock = 0;

  products.forEach((group) => {
    total += group._count.id;
    if (group.isActive && group.visibleMarket) active += group._count.id;
    if (group.stock <= 10 && group.stock > 0) lowStock += group._count.id;
    if (group.stock === 0) outOfStock += group._count.id;
  });

  // Get product names for best sellers
  const productIds = bestSellers.map((item) => item.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const bestSellersWithNames = bestSellers.map((item) => {
    const product = productNames.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      name: product?.name || 'Unknown Product',
      sales: item._sum.quantity || 0,
      revenue: item._sum.total || 0,
    };
  });

  return {
    total,
    active,
    lowStock,
    outOfStock,
    bestSellers: bestSellersWithNames,
  };
}

async function getCustomerAnalytics(storeId: string, start: Date, end: Date) {
  const [customers, orderValues] = await Promise.all([
    // Customer counts
    prisma.order.groupBy({
      by: ['customerId'],
      where: {
        storeId,
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { total: true },
    }),

    // Average order values
    prisma.order.aggregate({
      where: {
        storeId,
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
      },
      _avg: { total: true },
    }),
  ]);

  const total = customers.length;
  const newCustomers = customers.filter((c) => c._count.id === 1).length;
  const returning = total - newCustomers;
  const averageOrderValue = orderValues._avg.total || 0;

  return {
    total,
    new: newCustomers,
    returning,
    averageOrderValue,
  };
}

async function getPerformanceMetrics(storeId: string, start: Date, end: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: start, lte: end },
    },
    include: {
      orderEvents: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Calculate fulfillment rate
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const fulfillmentRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;

  // Calculate average fulfillment time
  const fulfillmentTimes = orders
    .filter((o) => o.status === 'DELIVERED' && o.deliveredAt)
    .map((o) => {
      const created = o.createdAt.getTime();
      const delivered = o.deliveredAt!.getTime();
      return (delivered - created) / (1000 * 60 * 60 * 24); // Days
    });

  const averageFulfillmentTime =
    fulfillmentTimes.length > 0
      ? fulfillmentTimes.reduce((sum, time) => sum + time, 0) / fulfillmentTimes.length
      : 0;

  return {
    fulfillmentRate,
    averageFulfillmentTime,
    customerSatisfaction: 4.5, // Placeholder - would come from ratings
    orderAccuracy: 98.5, // Placeholder - would come from order accuracy tracking
    responseTime: 2.3, // Placeholder - would come from response time tracking
    totalOrders: orders.length,
    completedOrders,
    cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
    refundRate: 2.1, // Placeholder - would come from refund tracking
    averageOrderValue:
      orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
    topProducts: [], // Will be populated by main function
    performanceTrends: [], // Will be populated by main function
  };
}

async function getPreviousPeriodData(storeId: string, start: Date, end: Date) {
  const periodLength = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - periodLength);
  const previousEnd = new Date(start.getTime());

  const [revenue, orders] = await Promise.all([
    prisma.order.aggregate({
      where: {
        storeId,
        paymentStatus: 'PAID',
        createdAt: { gte: previousStart, lte: previousEnd },
      },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: {
        storeId,
        createdAt: { gte: previousStart, lte: previousEnd },
      },
    }),
  ]);

  return {
    revenue: revenue._sum.total || 0,
    orders,
  };
}

async function getOrderStatistics(storeId: string, startDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
      total: true,
    },
  });

  const total = orders.length;
  const completed = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
  const refunded = orders.filter((o) => o.status === 'REFUNDED').length;
  const averageValue = total > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / total : 0;

  return {
    total,
    completed,
    cancelled,
    refundRate: total > 0 ? (refunded / total) * 100 : 0,
    averageValue,
  };
}

async function getFulfillmentMetrics(storeId: string, startDate: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: startDate },
    },
    select: {
      status: true,
      createdAt: true,
      deliveredAt: true,
    },
  });

  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');
  const fulfillmentRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

  // Calculate average fulfillment time
  const fulfillmentTimes = completedOrders
    .filter((o) => o.deliveredAt)
    .map((o) => {
      const created = o.createdAt.getTime();
      const delivered = o.deliveredAt!.getTime();
      return (delivered - created) / (1000 * 60 * 60 * 24); // Days
    });

  const averageTime =
    fulfillmentTimes.length > 0
      ? fulfillmentTimes.reduce((sum, time) => sum + time, 0) / fulfillmentTimes.length
      : 0;

  return {
    fulfillmentRate,
    averageTime,
    accuracy: 98.5, // Placeholder
    responseTime: 2.3, // Placeholder
  };
}

async function getCustomerSatisfaction(_storeId: string, _startDate: Date) {
  // Placeholder - would integrate with rating system
  return {
    averageRating: 4.5,
    totalRatings: 150,
  };
}

async function getTopProducts(storeId: string, startDate: Date) {
  const topProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      product: { storeId },
      order: {
        paymentStatus: 'PAID',
        createdAt: { gte: startDate },
      },
    },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const productIds = topProducts.map((item) => item.productId);
  const productNames = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  return topProducts.map((item) => {
    const product = productNames.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      name: product?.name || 'Unknown Product',
      salesCount: item._sum.quantity || 0,
      revenue: item._sum.total || 0,
    };
  });
}

async function getPerformanceTrends(storeId: string, startDate: Date) {
  // Get daily performance data for the last 30 days
  const trends = await prisma.order.groupBy({
    by: ['createdAt'],
    where: {
      storeId,
      createdAt: { gte: startDate },
    },
    _count: { id: true },
    _sum: { total: true },
  });

  return trends.map((trend) => ({
    date: trend.createdAt.toISOString().split('T')[0],
    orders: trend._count.id,
    revenue: trend._sum.total || 0,
    fulfillmentRate: 95.5, // Placeholder - would calculate actual rate
  }));
}
