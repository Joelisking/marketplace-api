var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export function getGlobalBestSellers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = Number(req.query.limit) || 10;
        const period = req.query.period || 'all'; // all, month, week
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
        // Get best-selling products across all stores
        const bestSellers = yield prisma.product.findMany({
            where: {
                visibleMarket: true,
                orderItems: {
                    some: {
                        order: Object.assign(Object.assign({}, dateFilter), { paymentStatus: 'PAID' }),
                    },
                },
            },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
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
                store: product.store,
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
export function getStoreBestSellers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { slug } = req.params;
        const limit = Number(req.query.limit) || 10;
        const period = req.query.period || 'all'; // all, month, week
        // Verify store exists
        const store = yield prisma.store.findUnique({
            where: { slug },
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
        // Get best-selling products for this store
        const bestSellers = yield prisma.product.findMany({
            where: {
                storeId: store.id,
                visibleMarket: true,
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
                salesData: {
                    totalSold,
                    totalRevenue,
                    averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                },
            };
        });
        res.json({
            store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
            },
            period,
            items: productsWithSales,
            meta: {
                total: productsWithSales.length,
            },
        });
    });
}
export function getFeaturedProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const limit = Number(req.query.limit) || 10;
        // Get featured products (best sellers from the last month)
        const featuredProducts = yield prisma.product.findMany({
            where: {
                visibleMarket: true,
                orderItems: {
                    some: {
                        order: {
                            createdAt: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                            },
                            paymentStatus: 'PAID',
                        },
                    },
                },
            },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                orderItems: {
                    where: {
                        order: {
                            createdAt: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                            },
                            paymentStatus: 'PAID',
                        },
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
        const productsWithSales = featuredProducts.map((product) => {
            const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
            return {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                imageUrl: product.imageUrl,
                store: product.store,
                salesData: {
                    totalSold,
                    totalRevenue,
                    averagePrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                },
            };
        });
        res.json({
            items: productsWithSales,
            meta: {
                total: productsWithSales.length,
                period: 'last_30_days',
            },
        });
    });
}
