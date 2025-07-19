var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ProductIdParam, ProductSearchQuery, ProductCreate, ProductUpdate, } from '../schema';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';
import { deleteImage } from '../services/upload.service';
export function getProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const query = ProductSearchQuery.parse(req.query);
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 20;
        // Get user from request (if authenticated)
        const user = req.user;
        let where = Object.assign(Object.assign(Object.assign({}, (query.storeId && { storeId: query.storeId })), (query.q && { name: { contains: query.q, mode: 'insensitive' } })), { visibleMarket: true });
        let storeIdFilter = query.storeId;
        // If user is authenticated, check their role and apply appropriate filtering
        if (user) {
            const userStore = yield prisma.store.findFirst({
                where: { owner: { id: user.id } },
            });
            if (userStore && user.role === 'VENDOR') {
                // Vendor: only show their own products
                where.storeId = userStore.id;
                storeIdFilter = userStore.id;
            }
            // Customer or user without store: show all products (no additional filtering)
        }
        const [items, total] = yield Promise.all([
            listProducts(Object.assign(Object.assign({}, query), { storeId: storeIdFilter, page, limit })),
            countProducts(where),
        ]);
        const dto = {
            items,
            meta: { total, page, pageSize: limit },
        };
        res.json(dto);
    });
}
export function getProductById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = ProductIdParam.parse(req.params);
        const product = yield prisma.product.findUnique({
            where: { id },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    });
}
export function createProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const data = ProductCreate.parse(req.body);
        // Get the current user's store ID from the request (assuming auth middleware sets this)
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Find the user's store
        const store = yield prisma.store.findFirst({
            where: { owner: { id: userId } },
        });
        if (!store) {
            return res
                .status(403)
                .json({ message: 'Vendor role required - you must own a store to create products' });
        }
        const product = yield prisma.product.create({
            data: Object.assign(Object.assign({}, data), { storeId: store.id }),
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
        res.status(201).json(product);
    });
}
export function updateProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { id } = ProductIdParam.parse(req.params);
        const data = ProductUpdate.parse(req.body);
        // Get the current user's store ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Check if the product exists and belongs to the user's store
        const existingProduct = yield prisma.product.findFirst({
            where: {
                id,
                store: {
                    owner: { id: userId },
                },
            },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found or access denied' });
        }
        // If imageUrl is being updated and it's different from the current one,
        // and the current imageUrl is from our upload service, delete the old image
        if (data.imageUrl && data.imageUrl !== existingProduct.imageUrl) {
            const currentImageUrl = existingProduct.imageUrl;
            // Check if the current image is from our upload service
            if (currentImageUrl.includes('/uploads/')) {
                try {
                    // Extract filename from URL
                    const urlParts = currentImageUrl.split('/');
                    const fileName = urlParts.slice(-2).join('/'); // Get 'uploads/filename.ext'
                    yield deleteImage({ fileName });
                }
                catch (error) {
                    console.warn('Failed to delete old product image:', error);
                    // Don't fail the update if image deletion fails
                }
            }
        }
        const product = yield prisma.product.update({
            where: { id },
            data,
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
        res.json(product);
    });
}
export function deleteProduct(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { id } = ProductIdParam.parse(req.params);
        // Get the current user's store ID from the request
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Check if the product exists and belongs to the user's store
        const existingProduct = yield prisma.product.findFirst({
            where: {
                id,
                store: {
                    owner: { id: userId },
                },
            },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found or access denied' });
        }
        // Delete the product image if it's from our upload service
        const imageUrl = existingProduct.imageUrl;
        if (imageUrl.includes('/uploads/')) {
            try {
                // Extract filename from URL
                const urlParts = imageUrl.split('/');
                const fileName = urlParts.slice(-2).join('/'); // Get 'uploads/filename.ext'
                yield deleteImage({ fileName });
            }
            catch (error) {
                console.warn('Failed to delete product image:', error);
                // Don't fail the deletion if image deletion fails
            }
        }
        yield prisma.product.delete({
            where: { id },
        });
        res.status(204).send();
    });
}
