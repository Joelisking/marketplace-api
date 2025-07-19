var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
                images: {
                    orderBy: { sortOrder: 'asc' },
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
        // Extract images data from request
        const { images } = data, productData = __rest(data, ["images"]);
        // Create product with transaction to handle images
        const product = yield prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            // Create the product with placeholder imageUrl (will be updated if images are provided)
            const newProduct = yield tx.product.create({
                data: Object.assign(Object.assign({}, productData), { storeId: store.id, imageUrl: 'https://via.placeholder.com/400x400?text=No+Image' }),
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
            // If images are provided, create them
            if (images && images.length > 0) {
                // Check if any image should be primary
                const hasPrimary = images.some((img) => img.isPrimary);
                // If no primary specified, make the first one primary
                if (!hasPrimary && images.length > 0) {
                    images[0].isPrimary = true;
                }
                // Create images
                const imageData = images.map((img, index) => (Object.assign(Object.assign({}, img), { productId: newProduct.id, sortOrder: index })));
                yield tx.productImage.createMany({
                    data: imageData,
                });
                // Update product's primary imageUrl for backward compatibility
                const primaryImage = images.find((img) => img.isPrimary);
                if (primaryImage) {
                    yield tx.product.update({
                        where: { id: newProduct.id },
                        data: { imageUrl: primaryImage.fileUrl },
                    });
                }
            }
            // Return product with images
            return tx.product.findUnique({
                where: { id: newProduct.id },
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                    images: {
                        orderBy: { sortOrder: 'asc' },
                    },
                },
            });
        }));
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
        // Extract product data (images handled separately via dedicated endpoints)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { images } = data, productData = __rest(data, ["images"]);
        const product = yield prisma.product.update({
            where: { id },
            data: productData,
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                images: {
                    orderBy: { sortOrder: 'asc' },
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
            include: {
                images: true,
            },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found or access denied' });
        }
        // Delete all product images from storage
        for (const image of existingProduct.images) {
            try {
                yield deleteImage({ fileName: image.fileName });
            }
            catch (error) {
                console.warn('Failed to delete product image:', error);
                // Don't fail the deletion if image deletion fails
            }
        }
        // Delete the product (this will cascade delete images from database)
        yield prisma.product.delete({
            where: { id },
        });
        res.status(204).send();
    });
}
