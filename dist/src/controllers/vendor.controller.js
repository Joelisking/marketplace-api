var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { prisma } from '../lib/prisma';
import { StoreUpdate } from '../schema/store';
export function getVendorDashboard(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Get vendor's store
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Get comprehensive statistics
        const [totalProducts, lowStockProducts, visibleProducts, totalOrders, totalRevenue, totalItemsSold, recentOrders,] = yield Promise.all([
            prisma.product.count({
                where: { storeId: store.id },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    stock: { lte: 10 },
                },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    visibleMarket: true,
                },
            }),
            prisma.order.count({
                where: { storeId: store.id },
            }),
            prisma.order.aggregate({
                where: {
                    storeId: store.id,
                    paymentStatus: 'PAID',
                },
                _sum: { total: true },
            }),
            prisma.orderItem.aggregate({
                where: {
                    product: { storeId: store.id },
                },
                _sum: { quantity: true },
            }),
            prisma.order.findMany({
                where: { storeId: store.id },
                orderBy: { id: 'desc' },
                take: 5,
                include: {
                    items: {
                        include: {
                            product: {
                                select: { name: true },
                            },
                        },
                    },
                },
            }),
        ]);
        const dashboard = {
            store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
                logoUrl: store.logoUrl,
            },
            owner: store.owner,
            stats: {
                totalProducts,
                lowStockProducts,
                visibleProducts,
                hiddenProducts: totalProducts - visibleProducts,
                totalOrders,
                totalRevenue: totalRevenue._sum.total || 0,
                totalItemsSold: totalItemsSold._sum.quantity || 0,
            },
            recentOrders: recentOrders.map((order) => ({
                id: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                total: order.total,
                itemCount: order.items.length,
                items: order.items.map((item) => ({
                    productName: item.product.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
            })),
        };
        res.json(dashboard);
    });
}
export function getVendorProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const search = req.query.q;
        // Get vendor's store
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Build where clause
        const where = {
            storeId: store.id,
        };
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        // Get products with pagination and sales data
        const [products, total] = yield Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                    orderItems: {
                        select: {
                            quantity: true,
                            price: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);
        // Calculate sales data for each product
        const productsWithSales = products.map((product) => {
            const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            return Object.assign(Object.assign({}, product), { salesData: {
                    totalSold,
                    totalRevenue,
                    averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                }, orderItems: undefined });
        });
        res.json({
            items: productsWithSales,
            meta: {
                total,
                page,
                pageSize: limit,
            },
        });
    });
}
export function getVendorProductStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Get vendor's store
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Get various product statistics
        const [totalProducts, visibleProducts, hiddenProducts, lowStockProducts, outOfStockProducts, totalValue, totalSold, totalRevenue,] = yield Promise.all([
            prisma.product.count({
                where: { storeId: store.id },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    visibleMarket: true,
                },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    visibleMarket: false,
                },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    stock: { lte: 10, gt: 0 },
                },
            }),
            prisma.product.count({
                where: {
                    storeId: store.id,
                    stock: 0,
                },
            }),
            prisma.product.aggregate({
                where: { storeId: store.id },
                _sum: {
                    price: true,
                },
            }),
            prisma.orderItem.aggregate({
                where: {
                    product: { storeId: store.id },
                },
                _sum: { quantity: true },
            }),
            prisma.orderItem.aggregate({
                where: {
                    product: { storeId: store.id },
                },
                _sum: {
                    price: true,
                },
            }),
        ]);
        const stats = {
            totalProducts,
            visibleProducts,
            hiddenProducts,
            lowStockProducts,
            outOfStockProducts,
            totalValue: totalValue._sum.price || 0,
            totalSold: totalSold._sum.quantity || 0,
            totalRevenue: totalRevenue._sum.price || 0,
            stockHealth: {
                healthy: totalProducts - lowStockProducts - outOfStockProducts,
                lowStock: lowStockProducts,
                outOfStock: outOfStockProducts,
            },
        };
        res.json(stats);
    });
}
export function getVendorBestSellers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const limit = Number(req.query.limit) || 10;
        const period = req.query.period || 'all'; // all, month, week
        // Get vendor's store
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Build date filter
        let dateFilter = {};
        if (period === 'month') {
            dateFilter = {
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            };
        }
        else if (period === 'week') {
            dateFilter = {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            };
        }
        // Get best-selling products
        const bestSellers = yield prisma.product.findMany({
            where: {
                storeId: store.id,
                orderItems: {
                    some: {
                        order: Object.assign(Object.assign({}, dateFilter), { paymentStatus: 'PAID' }),
                    },
                },
            },
            include: {
                orderItems: {
                    where: {
                        order: Object.assign(Object.assign({}, dateFilter), { paymentStatus: 'PAID' }),
                    },
                    select: {
                        quantity: true,
                        price: true,
                    },
                },
            },
            orderBy: {
                orderItems: {
                    _count: 'desc',
                },
            },
            take: limit,
        });
        // Calculate sales metrics
        const productsWithSales = bestSellers.map((product) => {
            const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            return {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                imageUrl: product.imageUrl,
                visibleMarket: product.visibleMarket,
                salesData: {
                    totalSold,
                    totalRevenue,
                    averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                },
            };
        });
        res.json({
            period,
            items: productsWithSales,
            meta: {
                total: productsWithSales.length,
            },
        });
    });
}
export function getVendorStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        res.json(store);
    });
}
export function updateVendorStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const data = StoreUpdate.parse(req.body);
        // Get vendor's store
        const existingStore = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (!existingStore) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // If slug is being updated, check if it's available
        if (data.slug && data.slug !== existingStore.slug) {
            const slugExists = yield prisma.store.findUnique({
                where: { slug: data.slug },
            });
            if (slugExists) {
                return res.status(409).json({ message: 'Store slug already exists' });
            }
        }
        // Update store
        const updatedStore = yield prisma.store.update({
            where: { id: existingStore.id },
            data,
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        res.json(updatedStore);
    });
}
