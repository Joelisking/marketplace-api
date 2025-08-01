/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Zod schemas for super admin operations
export const SystemOverviewQuery = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const VendorOverviewQuery = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
});

export const PaymentOverviewQuery = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['all', 'pending', 'completed', 'failed']).optional().default('all'),
});

/**
 * Get comprehensive system overview
 */
export async function getSystemOverview(query: z.infer<typeof SystemOverviewQuery>) {
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = query.endDate ? new Date(query.endDate) : new Date();

  const [
    totalUsers,
    totalVendors,
    totalStores,
    totalProducts,
    totalOrders,
    totalRevenue,
    totalPayouts,
    recentUsers,
    recentOrders,
    systemHealth,
  ] = await Promise.all([
    // User statistics
    prisma.user.count(),
    prisma.user.count({ where: { role: 'VENDOR' } }),
    prisma.store.count(),
    prisma.product.count(),

    // Order statistics
    prisma.order.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    }),

    // Revenue statistics
    prisma.order.aggregate({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { total: true },
    }),

    // Payout statistics
    prisma.vendorPayout.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),

    // Recent activity
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        store: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),

    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
        customer: {
          select: { email: true },
        },
      },
    }),

    // System health check
    getSystemHealth(),
  ]);

  return {
    overview: {
      totalUsers,
      totalVendors,
      totalStores,
      totalProducts,
      totalOrders: totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      totalPayouts: totalPayouts._sum.amount || 0,
      period: { startDate, endDate },
    },
    recentActivity: {
      users: recentUsers,
      orders: recentOrders,
    },
    systemHealth,
  };
}

/**
 * Get comprehensive vendor overview
 */
export async function getVendorOverview(query: z.infer<typeof VendorOverviewQuery>) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { store: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  if (query.status !== 'all') {
    where.store = {
      isActive: query.status === 'active',
    };
  }

  const [vendors, total] = await Promise.all([
    prisma.user.findMany({
      where: { ...where, role: 'VENDOR' },
      skip,
      take: limit,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            paystackAccountActive: true,
            paystackAccountCode: true,
            _count: {
              select: {
                products: true,
                orders: true,
              },
            },
          },
        },
        _count: {
          select: {
            vendorPayouts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { ...where, role: 'VENDOR' } }),
  ]);

  // Get vendor statistics
  const vendorStats = await Promise.all(
    vendors.map(async (vendor) => {
      const [totalRevenue, totalPayouts, recentOrders] = await Promise.all([
        prisma.order.aggregate({
          where: {
            storeId: vendor.store?.id,
            paymentStatus: 'PAID',
          },
          _sum: { total: true },
        }),
        prisma.vendorPayout.aggregate({
          where: {
            vendorId: vendor.id,
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        }),
        prisma.order.findMany({
          where: { storeId: vendor.store?.id },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        ...vendor,
        stats: {
          totalRevenue: totalRevenue._sum.total || 0,
          totalPayouts: totalPayouts._sum.amount || 0,
          recentOrders,
        },
      };
    }),
  );

  return {
    vendors: vendorStats,
    meta: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get payment and payout overview
 */
export async function getPaymentOverview(query: z.infer<typeof PaymentOverviewQuery>) {
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = query.endDate ? new Date(query.endDate) : new Date();

  const where: any = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (query.status !== 'all') {
    where.status = query.status.toUpperCase();
  }

  const [payouts, totalPayouts, totalAmount, payoutStats] = await Promise.all([
    prisma.vendorPayout.findMany({
      where,
      include: {
        vendor: {
          select: { email: true },
        },
        store: {
          select: { name: true },
        },
        order: {
          select: { paymentReference: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.vendorPayout.count({ where }),
    prisma.vendorPayout.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.vendorPayout.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  return {
    payouts,
    overview: {
      totalPayouts,
      totalAmount: totalAmount._sum.amount || 0,
      period: { startDate, endDate },
    },
    stats: payoutStats.reduce(
      (acc, stat) => {
        acc[stat.status.toLowerCase()] = {
          count: stat._count.id,
          amount: stat._sum.amount || 0,
        };
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    ),
  };
}

/**
 * Get system health metrics
 */
async function getSystemHealth() {
  const [dbConnection, activeStores, lowStockProducts, pendingPayouts] = await Promise.all([
    // Test database connection
    prisma.$queryRaw`SELECT 1 as test`.then(() => 'healthy').catch(() => 'unhealthy'),

    // Active stores count
    prisma.store.count({ where: { isActive: true } }),

    // Low stock products
    prisma.product.count({ where: { stock: { lte: 10 } } }),

    // Pending payouts
    prisma.vendorPayout.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    database: dbConnection,
    activeStores,
    lowStockProducts,
    pendingPayouts,
    timestamp: new Date(),
  };
}

/**
 * Get vendor details for super admin
 */
export async function getVendorDetails(vendorId: string) {
  const vendor = await prisma.user.findUnique({
    where: { id: vendorId, role: 'VENDOR' },
    include: {
      store: {
        include: {
          products: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              items: {
                include: {
                  product: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      },
      vendorPayouts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          order: {
            select: { paymentReference: true },
          },
        },
      },
    },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Get comprehensive statistics
  const [totalRevenue, totalPayouts, productStats] = await Promise.all([
    prisma.order.aggregate({
      where: {
        storeId: vendor.store?.id,
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
    }),
    prisma.vendorPayout.aggregate({
      where: {
        vendorId: vendor.id,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    }),
    prisma.product.groupBy({
      by: ['isActive'],
      where: { storeId: vendor.store?.id },
      _count: { id: true },
    }),
  ]);

  return {
    ...vendor,
    stats: {
      totalRevenue: totalRevenue._sum.total || 0,
      totalPayouts: totalPayouts._sum.amount || 0,
      productStats: productStats.reduce(
        (acc, stat) => {
          acc[stat.isActive ? 'active' : 'inactive'] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    },
  };
}

/**
 * Get system analytics and trends
 */
export async function getSystemAnalytics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [userGrowth, orderGrowth, revenueGrowth, topVendors] = await Promise.all([
    // User growth over time
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    }),

    // Order growth over time
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Revenue by day (last 30 days)
    prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true },
    }),

    // Top performing vendors
    prisma.order.groupBy({
      by: ['storeId'],
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  return {
    userGrowth,
    orderGrowth,
    revenueGrowth,
    topVendors,
  };
}
