/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { getVendorAnalytics, getVendorPerformance } from '../services/vendor-analytics.service';
import {
  updateFulfillmentTracking,
  getFulfillmentTracking,
  markOrderPickedUp,
  markOrderOutForDelivery,
  markOrderDelivered,
} from '../services/fulfillment-tracking.service';
import { getVendorMetrics } from '../services/vendor-analytics.service';

/**
 * Get comprehensive vendor analytics
 */
export async function getVendorAnalyticsController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const analytics = await getVendorAnalytics(vendorId, req.query as any);

    res.json(analytics);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get vendor analytics',
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
 * Get vendor performance metrics
 */
export async function getVendorPerformanceController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const performance = await getVendorPerformance(vendorId, req.query as any);

    res.json(performance);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get vendor performance',
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
 * Update order fulfillment tracking
 */
export async function updateFulfillmentTrackingController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    const { orderId } = req.params;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tracking = await updateFulfillmentTracking(orderId, vendorId, req.body);

    res.json({
      message: 'Fulfillment tracking updated successfully',
      tracking,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to update fulfillment tracking',
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
 * Get order fulfillment tracking
 */
export async function getFulfillmentTrackingController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    const { orderId } = req.params;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tracking = await getFulfillmentTracking(orderId, vendorId);

    res.json(tracking);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get fulfillment tracking',
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
 * Mark order as picked up by carrier
 */
export async function markOrderPickedUpController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    const { orderId } = req.params;
    const { trackingNumber, carrier } = req.body;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await markOrderPickedUp(orderId, vendorId, trackingNumber, carrier);

    res.json({
      message: 'Order marked as picked up successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to mark order as picked up',
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
 * Mark order as out for delivery
 */
export async function markOrderOutForDeliveryController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    const { orderId } = req.params;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await markOrderOutForDelivery(orderId, vendorId);

    res.json({
      message: 'Order marked as out for delivery successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to mark order as out for delivery',
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
 * Mark order as delivered
 */
export async function markOrderDeliveredController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    const { orderId } = req.params;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await markOrderDelivered(orderId, vendorId);

    res.json({
      message: 'Order marked as delivered successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to mark order as delivered',
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
 * Get vendor metrics with daily sales counts
 */
export async function getVendorMetricsController(req: Request, res: Response) {
  try {
    const vendorId = (req as any).user?.id;
    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { days, startDate, endDate } = req.query;
    const metrics = await getVendorMetrics(vendorId, {
      days: days ? Number(days) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json(metrics);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        message: 'Failed to get vendor metrics',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
