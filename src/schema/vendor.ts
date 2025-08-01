import { z } from 'zod';

// Vendor Analytics Query Schema
export const VendorAnalyticsQuery = z.object({
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Vendor Performance Metrics Schema
export const VendorPerformanceQuery = z.object({
  days: z.number().min(1).max(365).default(30),
  includeDetails: z.boolean().default(false),
});

// Fulfillment Tracking Schema
export const FulfillmentTrackingQuery = z.object({
  orderId: z.string(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  currentLocation: z.string().optional(),
  status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']).optional(),
});

// Vendor Rating Schema
export const VendorRatingSchema = z.object({
  orderId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().min(10).max(500).optional(),
  categories: z.array(z.enum(['QUALITY', 'DELIVERY', 'COMMUNICATION', 'PRICE'])).optional(),
});

// Vendor Performance Metrics Response
export const VendorPerformanceMetrics = z.object({
  fulfillmentRate: z.number(),
  averageFulfillmentTime: z.number(),
  customerSatisfaction: z.number(),
  orderAccuracy: z.number(),
  responseTime: z.number(),
  totalOrders: z.number(),
  completedOrders: z.number(),
  cancelledOrders: z.number(),
  refundRate: z.number(),
  averageOrderValue: z.number(),
  topProducts: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      salesCount: z.number(),
      revenue: z.number(),
    }),
  ),
  performanceTrends: z.array(
    z.object({
      date: z.string(),
      orders: z.number(),
      revenue: z.number(),
      fulfillmentRate: z.number(),
    }),
  ),
});

// Fulfillment Tracking Response
export const FulfillmentTrackingResponse = z.object({
  orderId: z.string(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  status: z.string(),
  estimatedDelivery: z.string().optional(),
  currentLocation: z.string().optional(),
  trackingHistory: z.array(
    z.object({
      status: z.string(),
      location: z.string().optional(),
      timestamp: z.string(),
      description: z.string(),
    }),
  ),
  lastUpdated: z.string(),
});

// Vendor Analytics Response
export const VendorAnalyticsResponse = z.object({
  period: z.string(),
  revenue: z.object({
    total: z.number(),
    average: z.number(),
    growth: z.number(),
    byDay: z.array(
      z.object({
        date: z.string(),
        amount: z.number(),
      }),
    ),
  }),
  orders: z.object({
    total: z.number(),
    average: z.number(),
    growth: z.number(),
    byStatus: z.array(
      z.object({
        status: z.string(),
        count: z.number(),
        percentage: z.number(),
      }),
    ),
  }),
  products: z.object({
    total: z.number(),
    active: z.number(),
    lowStock: z.number(),
    outOfStock: z.number(),
    bestSellers: z.array(
      z.object({
        productId: z.string(),
        name: z.string(),
        sales: z.number(),
        revenue: z.number(),
      }),
    ),
  }),
  customers: z.object({
    total: z.number(),
    new: z.number(),
    returning: z.number(),
    averageOrderValue: z.number(),
  }),
  performance: VendorPerformanceMetrics,
});
