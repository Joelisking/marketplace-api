import { z } from 'zod';
import { PaginationQuery } from './common';

// Customer order query parameters
export const CustomerOrderQuery = PaginationQuery.extend({
  status: z
    .enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional()
    .describe('Filter orders by status'),
});

// Customer order response
export const CustomerOrderResponse = z.object({
  id: z.string(),
  status: z.string(),
  paymentStatus: z.string(),
  total: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  store: z.object({
    id: z.string(),
    name: z.string(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string(),
      quantity: z.number(),
      price: z.number(),
      product: z.object({
        id: z.string(),
        name: z.string(),
        imageUrl: z.string(),
      }),
    }),
  ),
});

// Customer order list response
export const CustomerOrderListResponse = z.object({
  message: z.string(),
  data: z.object({
    orders: z.array(CustomerOrderResponse),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  }),
});

// Customer order details response
export const CustomerOrderDetailsResponse = z.object({
  message: z.string(),
  data: z.object({
    order: z.object({
      id: z.string(),
      status: z.string(),
      paymentStatus: z.string(),
      total: z.number(),
      subtotal: z.number(),
      tax: z.number(),
      shipping: z.number(),
      discount: z.number(),
      currency: z.string(),
      createdAt: z.date(),
      updatedAt: z.date().nullable(),
      estimatedDelivery: z.date().nullable(),
      deliveredAt: z.date().nullable(),
      shippingAddress: z
        .object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          postalCode: z.string(),
          country: z.string(),
        })
        .nullable(),
      billingAddress: z
        .object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          postalCode: z.string(),
          country: z.string(),
        })
        .nullable(),
      store: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      }),
      items: z.array(
        z.object({
          id: z.string(),
          productId: z.string(),
          quantity: z.number(),
          price: z.number(),
          product: z.object({
            id: z.string(),
            name: z.string(),
            imageUrl: z.string(),
          }),
        }),
      ),
    }),
  }),
});

// Order tracking response
export const OrderTrackingResponse = z.object({
  message: z.string(),
  data: z.object({
    orderId: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    estimatedDelivery: z.date().nullable(),
    deliveredAt: z.date().nullable(),
    currentLocation: z.string(),
    trackingEvents: z.array(
      z.object({
        eventType: z.string(),
        description: z.string(),
        timestamp: z.date(),
      }),
    ),
    deliveryUpdates: z.array(
      z.object({
        status: z.string(),
        location: z.string().nullable(),
        timestamp: z.date(),
        description: z.string(),
      }),
    ),
  }),
});

// Customer stats response
export const CustomerStatsResponse = z.object({
  message: z.string(),
  data: z.object({
    totalOrders: z.number(),
    totalSpent: z.number(),
    averageOrderValue: z.number(),
    ordersThisMonth: z.number(),
  }),
});

// Error response
export const ErrorResponse = z.object({
  message: z.string(),
  error: z.string().optional(),
});

// Order ID parameter for customer endpoints
export const CustomerOrderIdParam = z.object({
  orderId: z.string().describe('Order ID'),
});
