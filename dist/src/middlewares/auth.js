import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
export function authGuard(req, res, next) {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token)
        return res
            .status(401)
            .json({ message: 'Authentication required - please provide a valid token' });
    try {
        req.user = verifyToken(token); // Augment Express.Request in a `types/` declaration
        next();
    }
    catch (_a) {
        res.status(401).json({ message: 'Invalid or expired token - please authenticate again' });
    }
}
export function requireVendor(req, res, next) {
    const user = req.user;
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
    prisma.store
        .findFirst({
        where: { owner: { id: user.id } },
    })
        .then((store) => {
        if (!store) {
            return res
                .status(403)
                .json({ message: 'Vendor role required - you must own a store to create products' });
        }
        req.userStore = store; // Add store info to request
        next();
    })
        .catch(() => {
        res.status(500).json({ message: 'Internal server error' });
    });
}
export function requireStoreOwnership(req, res, next) {
    const user = req.user;
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
export function requireProductOwnership(req, res, next) {
    const user = req.user;
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
