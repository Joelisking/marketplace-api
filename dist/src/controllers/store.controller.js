import { StoreCreate, StoreUpdate, StoreSearchQuery, StoreSlugParam, ProductSearchQuery, } from '../schema';
import { listStores, countStores } from '../services/store.service';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';
import { signAccess } from '../utils/jwt';
import { deleteImage } from '../services/upload.service';
export async function getStores(req, res) {
    const query = StoreSearchQuery.parse(req.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};
    const [items, total] = await Promise.all([
        listStores({ ...query, page, limit }),
        countStores(where),
    ]);
    const dto = { items, meta: { total, page, pageSize: limit } };
    res.json(dto);
}
export async function getStore(req, res) {
    const { slug } = StoreSlugParam.parse(req.params);
    const store = await prisma.store.findUnique({
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
}
export async function getStoreProducts(req, res) {
    const { slug } = StoreSlugParam.parse(req.params);
    const store = await prisma.store.findUnique({ where: { slug } });
    if (!store)
        return res.status(404).json({ message: 'Store not found' });
    const query = ProductSearchQuery.parse(req.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
        storeId: store.id,
        ...(query.q && { name: { contains: query.q, mode: 'insensitive' } }),
        visibleMarket: true,
    };
    const [items, total] = await Promise.all([
        listProducts({ ...query, storeId: store.id, page, limit }),
        countProducts(where),
    ]);
    const dto = {
        items,
        meta: { total, page, pageSize: limit },
    };
    res.json(dto);
}
export async function createStore(req, res) {
    const data = StoreCreate.parse(req.body);
    // Get the current user ID from the request
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // Check if the user already has a store
    const existingStore = await prisma.store.findFirst({
        where: { owner: { id: userId } },
    });
    if (existingStore) {
        return res.status(409).json({ message: 'You already own a store' });
    }
    // Check if the slug is already taken
    const slugExists = await prisma.store.findUnique({
        where: { slug: data.slug },
    });
    if (slugExists) {
        return res.status(409).json({ message: 'Store slug already exists' });
    }
    // Create the store and promote user to VENDOR role
    const store = await prisma.store.create({
        data: {
            ...data,
            owner: { connect: { id: userId } },
        },
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
    // Update user role to VENDOR if not already a vendor
    let updatedUser = store.owner;
    if (store.owner && store.owner.role !== 'VENDOR') {
        updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: 'VENDOR' },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });
    }
    // Generate new token with updated role and store ID
    const newToken = signAccess({
        id: updatedUser?.id || userId,
        role: updatedUser?.role || 'VENDOR',
        storeId: store.id,
    });
    res.status(201).json({
        ...store,
        newToken, // Include new token in response
    });
}
export async function updateStore(req, res) {
    const { slug } = StoreSlugParam.parse(req.params);
    const data = StoreUpdate.parse(req.body);
    // Get the current user ID from the request
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // Check if the store exists and belongs to the user
    const existingStore = await prisma.store.findFirst({
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
                await deleteImage({ fileName });
            }
            catch (error) {
                console.warn('Failed to delete old store logo:', error);
                // Don't fail the update if image deletion fails
            }
        }
    }
    // If slug is being updated, check if the new slug is available
    if (data.slug && data.slug !== slug) {
        const slugExists = await prisma.store.findUnique({
            where: { slug: data.slug },
        });
        if (slugExists) {
            return res.status(409).json({ message: 'Store slug already exists' });
        }
    }
    const store = await prisma.store.update({
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
}
export async function deleteStore(req, res) {
    const { slug } = StoreSlugParam.parse(req.params);
    // Get the current user ID from the request
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // Check if the store exists and belongs to the user
    const existingStore = await prisma.store.findFirst({
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
            await deleteImage({ fileName });
        }
        catch (error) {
            console.warn('Failed to delete store logo:', error);
            // Don't fail the deletion if image deletion fails
        }
    }
    // Delete all products in the store (this will also clean up their images)
    const products = await prisma.product.findMany({
        where: { storeId: existingStore.id },
        select: { imageUrl: true },
    });
    // Delete product images
    for (const product of products) {
        if (product.imageUrl.includes('/uploads/')) {
            try {
                const urlParts = product.imageUrl.split('/');
                const fileName = urlParts.slice(-2).join('/');
                await deleteImage({ fileName });
            }
            catch (error) {
                console.warn('Failed to delete product image during store deletion:', error);
            }
        }
    }
    // Delete the store (this will cascade delete products)
    await prisma.store.delete({
        where: { slug },
    });
    res.status(204).send();
}
