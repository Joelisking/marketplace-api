/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { FulfillmentTrackingQuery, FulfillmentTrackingResponse } from '../schema/vendor';

/**
 * Update order fulfillment tracking information
 */
export async function updateFulfillmentTracking(
  orderId: string,
  vendorId: string,
  trackingData: z.infer<typeof FulfillmentTrackingQuery>,
): Promise<z.infer<typeof FulfillmentTrackingResponse>> {
  const { trackingNumber, carrier, estimatedDelivery, currentLocation, status } =
    FulfillmentTrackingQuery.parse(trackingData);

  // Verify vendor owns this order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { owner: { id: vendorId } },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Update order with tracking information
  await prisma.order.update({
    where: { id: orderId },
    data: {
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
      notes: trackingNumber
        ? `Tracking: ${trackingNumber}${carrier ? ` (${carrier})` : ''}`
        : order.notes,
      updatedAt: new Date(),
    },
  });

  // Create tracking event
  await prisma.orderEvent.create({
    data: {
      orderId,
      eventType: 'ORDER_SHIPPED',
      description: `Order shipped${carrier ? ` via ${carrier}` : ''}${trackingNumber ? ` - Tracking: ${trackingNumber}` : ''}`,
      metadata: {
        trackingNumber,
        carrier,
        currentLocation,
        status,
      },
    },
  });

  // Get tracking history
  const trackingHistory = await getTrackingHistory(orderId);

  return {
    orderId,
    trackingNumber,
    carrier,
    status: status || 'IN_TRANSIT',
    estimatedDelivery: estimatedDelivery || undefined,
    currentLocation,
    trackingHistory,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get fulfillment tracking information for an order
 */
export async function getFulfillmentTracking(
  orderId: string,
  vendorId: string,
): Promise<z.infer<typeof FulfillmentTrackingResponse>> {
  // Verify vendor owns this order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { owner: { id: vendorId } },
    },
    select: {
      id: true,
      estimatedDelivery: true,
      notes: true,
      updatedAt: true,
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Extract tracking information from notes
  const trackingMatch = order.notes?.match(/Tracking: ([^\s]+)(?:\s+\(([^)]+)\))?/);
  const trackingNumber = trackingMatch?.[1];
  const carrier = trackingMatch?.[2];

  // Get tracking history
  const trackingHistory = await getTrackingHistory(orderId);

  // Determine current status based on order status and events
  const currentStatus = await getCurrentTrackingStatus(orderId);

  return {
    orderId,
    trackingNumber,
    carrier,
    status: currentStatus,
    estimatedDelivery: order.estimatedDelivery?.toISOString(),
    currentLocation: undefined, // Would be populated by external tracking API
    trackingHistory,
    lastUpdated: order.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

/**
 * Get tracking history for an order
 */
async function getTrackingHistory(orderId: string) {
  const events = await prisma.orderEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
    select: {
      eventType: true,
      description: true,
      createdAt: true,
      metadata: true,
    },
  });

  return events.map((event) => ({
    status: event.eventType,
    location: (event.metadata as any)?.currentLocation,
    timestamp: event.createdAt.toISOString(),
    description: event.description,
  }));
}

/**
 * Get current tracking status based on order status and events
 */
async function getCurrentTrackingStatus(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  switch (order.status) {
    case 'PENDING':
      return 'PENDING';
    case 'PROCESSING':
      return 'PROCESSING';
    case 'SHIPPED':
      return 'IN_TRANSIT';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Mark order as picked up by carrier
 */
export async function markOrderPickedUp(
  orderId: string,
  vendorId: string,
  trackingNumber?: string,
  carrier?: string,
): Promise<void> {
  // Verify vendor owns this order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { owner: { id: vendorId } },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Update order status to shipped
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      updatedAt: new Date(),
      notes: trackingNumber
        ? `Tracking: ${trackingNumber}${carrier ? ` (${carrier})` : ''}`
        : order.notes,
    },
  });

  // Create tracking event
  await prisma.orderEvent.create({
    data: {
      orderId,
      eventType: 'ORDER_SHIPPED',
      description: `Order picked up by carrier${carrier ? ` (${carrier})` : ''}${trackingNumber ? ` - Tracking: ${trackingNumber}` : ''}`,
      metadata: {
        trackingNumber,
        carrier,
        status: 'PICKED_UP',
      },
    },
  });
}

/**
 * Mark order as out for delivery
 */
export async function markOrderOutForDelivery(orderId: string, vendorId: string): Promise<void> {
  // Verify vendor owns this order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { owner: { id: vendorId } },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Create tracking event
  await prisma.orderEvent.create({
    data: {
      orderId,
      eventType: 'ORDER_SHIPPED',
      description: 'Order out for delivery',
      metadata: {
        status: 'OUT_FOR_DELIVERY',
      },
    },
  });
}

/**
 * Mark order as delivered
 */
export async function markOrderDelivered(orderId: string, vendorId: string): Promise<void> {
  // Verify vendor owns this order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      store: { owner: { id: vendorId } },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied');
  }

  // Update order status to delivered
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create tracking event
  await prisma.orderEvent.create({
    data: {
      orderId,
      eventType: 'ORDER_DELIVERED',
      description: 'Order delivered successfully',
      metadata: {
        status: 'DELIVERED',
      },
    },
  });
}
