import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { deleteImage } from '../services/upload.service';
import {
  ProductImageCreate,
  ProductImageUpdate,
  ProductImageIdParam,
  ProductImageReorderRequest,
} from '../schema';

// Type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

/**
 * Add images to a product
 */
export async function addProductImages(req: AuthenticatedRequest, res: Response) {
  const { productId } = ProductImageIdParam.parse(req.params);
  const imagesData = z.array(ProductImageCreate).parse(req.body);

  // Get the current user's store ID from the request
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product exists and belongs to the user's store
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      store: {
        owner: { id: userId },
      },
    },
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found or access denied' });
  }

  // Check if any image should be primary
  const hasPrimary = imagesData.some((img) => img.isPrimary);

  // If no primary specified, make the first one primary
  if (!hasPrimary && imagesData.length > 0) {
    imagesData[0].isPrimary = true;
  }

  // If setting a new primary, unset existing primary
  if (hasPrimary) {
    await prisma.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  // Get current max sort order
  const maxSortOrder = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const startSortOrder = (maxSortOrder?.sortOrder ?? -1) + 1;

  // Create images
  const images = await prisma.productImage.createMany({
    data: imagesData.map((img, index) => ({
      ...img,
      productId,
      sortOrder: startSortOrder + index,
    })),
  });

  // Update product's primary imageUrl for backward compatibility
  const primaryImage = imagesData.find((img) => img.isPrimary);
  if (primaryImage) {
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: primaryImage.fileUrl },
    });
  }

  res.status(201).json({
    message: `${images.count} images added successfully`,
    addedCount: images.count,
  });
}

/**
 * Update a product image
 */
export async function updateProductImage(req: AuthenticatedRequest, res: Response) {
  const { productId, imageId } = ProductImageIdParam.parse(req.params);
  const updateData = ProductImageUpdate.parse(req.body);

  // Get the current user's store ID from the request
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product image exists and belongs to the user's store
  const productImage = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      product: {
        store: {
          owner: { id: userId },
        },
      },
    },
    include: {
      product: true,
    },
  });

  if (!productImage) {
    return res.status(404).json({ message: 'Product image not found or access denied' });
  }

  // If setting this image as primary, unset other primary images
  if (updateData.isPrimary) {
    await prisma.productImage.updateMany({
      where: {
        productId,
        isPrimary: true,
        id: { not: imageId },
      },
      data: { isPrimary: false },
    });

    // Update product's primary imageUrl for backward compatibility
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: productImage.fileUrl },
    });
  }

  const updatedImage = await prisma.productImage.update({
    where: { id: imageId },
    data: updateData,
  });

  res.json(updatedImage);
}

/**
 * Delete a product image
 */
export async function deleteProductImage(req: AuthenticatedRequest, res: Response) {
  const { productId, imageId } = ProductImageIdParam.parse(req.params);

  // Get the current user's store ID from the request
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product image exists and belongs to the user's store
  const productImage = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      product: {
        store: {
          owner: { id: userId },
        },
      },
    },
  });

  if (!productImage) {
    return res.status(404).json({ message: 'Product image not found or access denied' });
  }

  // Delete the image from storage
  try {
    await deleteImage({ fileName: productImage.fileName });
  } catch (error) {
    console.warn('Failed to delete product image from storage:', error);
    // Don't fail the deletion if storage deletion fails
  }

  // Delete the database record
  await prisma.productImage.delete({
    where: { id: imageId },
  });

  // If this was the primary image, set a new primary
  if (productImage.isPrimary) {
    const newPrimary = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    if (newPrimary) {
      await prisma.productImage.update({
        where: { id: newPrimary.id },
        data: { isPrimary: true },
      });

      // Update product's primary imageUrl for backward compatibility
      await prisma.product.update({
        where: { id: productId },
        data: { imageUrl: newPrimary.fileUrl },
      });
    }
  }

  res.status(204).send();
}

/**
 * Reorder product images
 */
export async function reorderProductImages(req: AuthenticatedRequest, res: Response) {
  const { productId } = ProductImageIdParam.parse(req.params);
  const { imageIds } = ProductImageReorderRequest.parse(req.body);

  // Get the current user's store ID from the request
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if the product exists and belongs to the user's store
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      store: {
        owner: { id: userId },
      },
    },
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found or access denied' });
  }

  // Verify all image IDs belong to this product
  const existingImages = await prisma.productImage.findMany({
    where: {
      id: { in: imageIds },
      productId,
    },
  });

  if (existingImages.length !== imageIds.length) {
    return res.status(400).json({ message: 'Some image IDs do not belong to this product' });
  }

  // Update sort order for each image
  const updates = imageIds.map((imageId, index) =>
    prisma.productImage.update({
      where: { id: imageId },
      data: { sortOrder: index },
    }),
  );

  await prisma.$transaction(updates);

  res.json({ message: 'Images reordered successfully' });
}

/**
 * Get all images for a product
 */
export async function getProductImages(req: Request, res: Response) {
  const { productId } = ProductImageIdParam.parse(req.params);

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  });

  res.json(images);
}
