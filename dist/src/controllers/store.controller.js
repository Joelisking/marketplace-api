var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { StoreCreate, StoreUpdate, StoreSearchQuery, StoreSlugParam, ProductSearchQuery, } from '../schema';
import { listStores, countStores } from '../services/store.service';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';
import { signAccess } from '../utils/jwt';
import { deleteImage } from '../services/upload.service';
export function getStores(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const query = StoreSearchQuery.parse(req.query);
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 20;
        const where = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};
        const [items, total] = yield Promise.all([
            listStores(Object.assign(Object.assign({}, query), { page, limit })),
            countStores(where),
        ]);
        const dto = { items, meta: { total, page, pageSize: limit } };
        res.json(dto);
    });
}
export function getStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { slug } = StoreSlugParam.parse(req.params);
        const store = yield prisma.store.findUnique({
            where: { slug },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });
        if (!store)
            return res.status(404).json({ message: 'Store not found' });
        res.json(store);
    });
}
export function getStoreProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { slug } = StoreSlugParam.parse(req.params);
        const store = yield prisma.store.findUnique({ where: { slug } });
        if (!store)
            return res.status(404).json({ message: 'Store not found' });
        const query = ProductSearchQuery.parse(req.query);
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 20;
        const where = Object.assign(Object.assign({ storeId: store.id }, (query.q && { name: { contains: query.q, mode: 'insensitive' } })), { visibleMarket: true });
        const [items, total] = yield Promise.all([
            listProducts(Object.assign(Object.assign({}, query), { storeId: store.id, page, limit })),
            countProducts(where),
        ]);
        const dto = {
            items,
            meta: { total, page, pageSize: limit },
        };
        res.json(dto);
    });
}
export function createStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = StoreCreate.parse(req.body);
        // Get the current user ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Check if the user already has a store
        const existingStore = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (existingStore) {
            return res.status(409).json({ message: 'You already own a store' });
        }
        // Check if the slug is already taken
        const slugExists = yield prisma.store.findUnique({
            where: { slug: data.slug },
        });
        if (slugExists) {
            return res.status(409).json({ message: 'Store slug already exists' });
        }
        // Create the store and promote user to VENDOR role
        const store = yield prisma.store.create({
            data: Object.assign(Object.assign({}, data), { owner: { connect: { id: userId } } }),
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
        // Promote user to VENDOR role
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: { role: 'VENDOR' },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });
        // Generate new token with updated role
        const newToken = signAccess({
            id: updatedUser.id,
            role: updatedUser.role,
            storeId: store.id,
        });
        res.status(201).json(Object.assign(Object.assign({}, store), { newToken }));
    });
}
export function updateStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { slug } = StoreSlugParam.parse(req.params);
        const data = StoreUpdate.parse(req.body);
        // Get the current user ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Check if the store exists and belongs to the user
        const existingStore = yield prisma.store.findFirst({
            where: {
                slug,
                owner: { id: userId },
            },
        });
        if (!existingStore) {
            return res.status(404).json({ message: 'Store not found or access denied' });
        }
        // If logoUrl is being updated and it's different from the current one,
        // and the current logoUrl is from our upload service, delete the old image
        if (data.logoUrl && data.logoUrl !== existingStore.logoUrl && existingStore.logoUrl) {
            const currentLogoUrl = existingStore.logoUrl;
            // Check if the current logo is from our upload service
            if (currentLogoUrl.includes('/uploads/')) {
                try {
                    // Extract filename from URL
                    const urlParts = currentLogoUrl.split('/');
                    const fileName = urlParts.slice(-2).join('/'); // Get 'uploads/filename.ext'
                    yield deleteImage({ fileName });
                }
                catch (error) {
                    console.warn('Failed to delete old store logo:', error);
                    // Don't fail the update if image deletion fails
                }
            }
        }
        // If slug is being updated, check if the new slug is available
        if (data.slug && data.slug !== slug) {
            const slugExists = yield prisma.store.findUnique({
                where: { slug: data.slug },
            });
            if (slugExists) {
                return res.status(409).json({ message: 'Store slug already exists' });
            }
        }
        const store = yield prisma.store.update({
            where: { slug },
            data,
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });
        res.json(store);
    });
}
export function deleteStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { slug } = StoreSlugParam.parse(req.params);
        // Get the current user ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Check if the store exists and belongs to the user
        const existingStore = yield prisma.store.findFirst({
            where: {
                slug,
                owner: { id: userId },
            },
        });
        if (!existingStore) {
            return res.status(404).json({ message: 'Store not found or access denied' });
        }
        // Delete the store logo if it's from our upload service
        if (existingStore.logoUrl && existingStore.logoUrl.includes('/uploads/')) {
            try {
                // Extract filename from URL
                const urlParts = existingStore.logoUrl.split('/');
                const fileName = urlParts.slice(-2).join('/'); // Get 'uploads/filename.ext'
                yield deleteImage({ fileName });
            }
            catch (error) {
                console.warn('Failed to delete store logo:', error);
                // Don't fail the deletion if image deletion fails
            }
        }
        // Delete all products in the store (this will also clean up their images)
        const products = yield prisma.product.findMany({
            where: { storeId: existingStore.id },
            select: { imageUrl: true },
        });
        // Delete product images
        for (const product of products) {
            if (product.imageUrl.includes('/uploads/')) {
                try {
                    const urlParts = product.imageUrl.split('/');
                    const fileName = urlParts.slice(-2).join('/');
                    yield deleteImage({ fileName });
                }
                catch (error) {
                    console.warn('Failed to delete product image during store deletion:', error);
                }
            }
        }
        // Delete the store (this will cascade delete products)
        yield prisma.store.delete({
            where: { slug },
        });
        res.status(204).send();
    });
}
