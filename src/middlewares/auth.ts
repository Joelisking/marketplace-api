/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token)
    return res
      .status(401)
      .json({ message: 'Authentication required - please provide a valid token' });

  try {
    req.user = verifyToken(token); // Augment Express.Request in a `types/` declaration
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token - please authenticate again' });
  }
}

export function requireSuper(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user has SUPER role
  if (user.role !== 'SUPER') {
    return res.status(403).json({
      message: 'Super admin access required - you must have super admin permissions',
    });
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user has ADMIN or SUPER role
  if (user.role !== 'ADMIN' && user.role !== 'SUPER') {
    return res.status(403).json({
      message: 'Admin access required - you must have admin permissions',
    });
  }

  next();
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user has VENDOR role
  if (user.role !== 'VENDOR') {
    return res.status(403).json({
      message: 'Vendor role required - you must have vendor permissions to create products',
    });
  }

  // Check if user has a store (vendors must own a store)
  // First check if user has a storeId, then check if that store exists
  if (!user.storeId) {
    return res
      .status(403)
      .json({ message: 'Vendor role required - you must own a store to create products' });
  }

  prisma.store
    .findFirst({
      where: {
        id: user.storeId,
        owner: { id: user.id },
      },
    })
    .then((store) => {
      if (!store) {
        return res
          .status(403)
          .json({ message: 'Vendor role required - you must own a store to create products' });
      }

      (req as any).userStore = store; // Add store info to request
      next();
    })
    .catch(() => {
      res.status(500).json({ message: 'Internal server error' });
    });
}

export function requireVendorRole(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Check if user has VENDOR role
  if (user.role !== 'VENDOR') {
    return res.status(403).json({
      message: 'Vendor role required - you must have vendor permissions to access this resource',
    });
  }

  // Optionally check for store ownership but don't require it
  prisma.store
    .findFirst({
      where: { owner: { id: user.id } },
    })
    .then((store) => {
      if (store) {
        (req as any).userStore = store; // Add store info to request if available
      }
      next();
    })
    .catch(() => {
      // Continue even if store lookup fails
      next();
    });
}

export function requireStoreOwnership(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const storeId = req.params.storeId || req.body.storeId;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!storeId) {
    return res.status(400).json({ message: 'Store ID required' });
  }

  // Check if user owns the store
  prisma.store
    .findFirst({
      where: {
        id: storeId,
        owner: { id: user.id },
      },
    })
    .then((store) => {
      if (!store) {
        return res.status(403).json({ message: 'Access denied - you do not own this store' });
      }
      next();
    })
    .catch(() => {
      res.status(500).json({ message: 'Internal server error' });
    });
}

export function requireProductOwnership(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const productId = req.params.id;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!productId) {
    return res.status(400).json({ message: 'Product ID required' });
  }

  // Check if user owns the product (through store ownership)
  prisma.product
    .findFirst({
      where: {
        id: productId,
        store: {
          owner: { id: user.id },
        },
      },
    })
    .then((product) => {
      if (!product) {
        return res.status(403).json({ message: 'Access denied - you do not own this product' });
      }
      next();
    })
    .catch(() => {
      res.status(500).json({ message: 'Internal server error' });
    });
}

// Alias for authGuard - used for consistency across routes
export const authenticate = authGuard;

// Optional authentication - sets user if token is valid but doesn't block
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    // No token provided, continue without user
    return next();
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    // Invalid token, continue without user
    next();
  }
}
