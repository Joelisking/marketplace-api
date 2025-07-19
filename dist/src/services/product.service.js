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
export function listProducts(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { q, category, storeId, page, limit } = params;
        const whereConditions = [];
        if (storeId) {
            whereConditions.push({ storeId });
        }
        if (q) {
            whereConditions.push({ name: { contains: q, mode: 'insensitive' } });
        }
        if (category) {
            // Note: Category filtering is not implemented in the current schema
            // This would need to be added to the Product model in Prisma schema
            console.warn('Category filtering requested but not implemented');
        }
        whereConditions.push({ visibleMarket: true });
        return prisma.product.findMany({
            where: {
                AND: whereConditions,
            },
            skip: (page - 1) * limit,
            take: limit,
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
    });
}
export function countProducts(where) {
    return prisma.product.count({ where });
}
