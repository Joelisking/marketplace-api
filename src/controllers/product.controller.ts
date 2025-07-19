/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  ProductIdParam,
  ProductSearchQuery,
  ProductListResponse,
  ProductCreate,
  ProductUpdate,
} from '../schema';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';
import { deleteImage } from '../services/upload.service';

export async function getProducts(req: Request, res: Response) {
  const query = ProductSearchQuery.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  // Get user from request (if authenticated)
  const user = (req as any).user;

  let where: any = {
    ...(query.storeId && { storeId: query.storeId }),
    ...(query.q && { name: { contains: query.q, mode: 'insensitive' } }),
    visibleMarket: true,
  };

  let storeIdFilter: string | undefined = query.storeId;

  // If user is authenticated, check their role and apply appropriate filtering
  if (user) {
    const userStore = await prisma.store.findFirst({
      where: { owner: { id: user.id } },
    });

    if (userStore && user.role === 'VENDOR') {
      // Vendor: only show their own products
      where.storeId = userStore.id;
      storeIdFilter = userStore.id;
    }
    // Customer or user without store: show all products (no additional filtering)
  }

  const [items, total] = await Promise.all([
    listProducts({ ...query, storeId: storeIdFilter, page, limit }),
    countProducts(where),
  ]);

  const dto: z.infer<typeof ProductListResponse> = {
    items,
    meta: { total, page, pageSize: limit },
  };
  res.json(dto);
}

export async function getProductById(req: Request, res: Response) {
  const { id } = ProductIdParam.parse(req.params);
  const product = await prisma.product.findUnique({
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
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = ProductCreate.parse(req.body);

  // Get the current user's store ID from the request (assuming auth middleware sets this)
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Find the user's store
  const store = await prisma.store.findFirst({
    where: { owner: { id: userId } },
  });

  if (!store) {
    return res
      .status(403)
      .json({ message: 'Vendor role required - you must own a store to create products' });
  }

  // Extract images data from request
  const { images, ...productData } = data;

  // Create product with transaction to handle images
  const product = await prisma.$transaction(async (tx) => {
    // Create the product with placeholder imageUrl (will be updated if images are provided)
    const newProduct = await tx.product.create({
      data: {
        ...productData,
        storeId: store.id,
        imageUrl: 'https://via.placeholder.com/400x400?text=No+Image', // Default placeholder
      },
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
      const imageData = images.map((img, index) => ({
        ...img,
        productId: newProduct.id,
        sortOrder: index,
      }));

      await tx.productImage.createMany({
        data: imageData,
      });

      // Update product's primary imageUrl for backward compatibility
      const primaryImage = images.find((img) => img.isPrimary);
      if (primaryImage) {
        await tx.product.update({
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
  });

  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = ProductIdParam.parse(req.params);
  const data = ProductUpdate.parse(req.body);

  // Get the current user's store ID from the request
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product exists and belongs to the user's store
  const existingProduct = await prisma.product.findFirst({
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
  const { images, ...productData } = data;

  const product = await prisma.product.update({
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
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = ProductIdParam.parse(req.params);

  // Get the current user's store ID from the request
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product exists and belongs to the user's store
  const existingProduct = await prisma.product.findFirst({
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
      await deleteImage({ fileName: image.fileName });
    } catch (error) {
      console.warn('Failed to delete product image:', error);
      // Don't fail the deletion if image deletion fails
    }
  }

  // Delete the product (this will cascade delete images from database)
  await prisma.product.delete({
    where: { id },
  });

  res.status(204).send();
}
