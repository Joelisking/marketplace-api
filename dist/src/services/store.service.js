"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStores = listStores;
exports.countStores = countStores;
const prisma_1 = require("../lib/prisma");
function listStores(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { q, page, limit } = params;
        const stores = yield prisma_1.prisma.store.findMany({
            where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
            skip: (page - 1) * limit,
            take: limit,
            include: {
                owner: true,
            },
        });
        return stores.map((store) => {
            var _a;
            return ({
                id: store.id,
                ownerId: ((_a = store.owner) === null || _a === void 0 ? void 0 : _a.id) || '',
                name: store.name,
                slug: store.slug,
                logoUrl: store.logoUrl,
            });
        });
    });
}
function countStores(where) {
    return prisma_1.prisma.store.count({ where });
}
