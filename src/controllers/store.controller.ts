import { Request, Response } from 'express';
import { z } from 'zod';
import {
  StoreSlugParam,
  StoreSearchQuery,
  StoreListResponse,
  ProductSearchQuery,
  ProductListResponse,
} from '../schema';
import { listStores, countStores } from '../services/store.service';
import { listProducts, countProducts } from '../services/product.service';
import { prisma } from '../lib/prisma';

export async function getStores(req: Request, res: Response) {
  const query = StoreSearchQuery.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};

  const [items, total] = await Promise.all([
    listStores({ ...query, page, limit }),
    countStores(where),
  ]);

  const dto: z.infer<typeof StoreListResponse> = { items, meta: { total, page, pageSize: limit } };
  res.json(dto);
}

export async function getStore(req: Request, res: Response) {
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
  if (!store) return res.status(404).json({ message: 'Store not found' });
  res.json(store);
}

export async function getStoreProducts(req: Request, res: Response) {
  const { slug } = StoreSlugParam.parse(req.params);
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return res.status(404).json({ message: 'Store not found' });

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

  const dto: z.infer<typeof ProductListResponse> = {
    items,
    meta: { total, page, pageSize: limit },
  };
  res.json(dto);
}
