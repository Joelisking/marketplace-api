import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductIdParam, ProductSearchQuery, ProductListResponse } from '../schema';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';

export async function getProducts(req: Request, res: Response) {
  const query = ProductSearchQuery.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where = {
    ...(query.storeId && { storeId: query.storeId }),
    ...(query.q && { name: { contains: query.q, mode: 'insensitive' } }),
    visibleMarket: true,
  };

  const [items, total] = await Promise.all([
    listProducts({ ...query, page, limit }),
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
    },
  });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}
