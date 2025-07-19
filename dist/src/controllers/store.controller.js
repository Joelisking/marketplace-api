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
exports.getStores = getStores;
exports.getStore = getStore;
exports.getStoreProducts = getStoreProducts;
const schema_1 = require("../schema");
const store_service_1 = require("../services/store.service");
const product_service_1 = require("../services/product.service");
const prisma_1 = require("../lib/prisma");
function getStores(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const query = schema_1.StoreSearchQuery.parse(req.query);
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 20;
        const where = query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {};
        const [items, total] = yield Promise.all([
            (0, store_service_1.listStores)(Object.assign(Object.assign({}, query), { page, limit })),
            (0, store_service_1.countStores)(where),
        ]);
        const dto = { items, meta: { total, page, pageSize: limit } };
        res.json(dto);
    });
}
function getStore(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { slug } = schema_1.StoreSlugParam.parse(req.params);
        const store = yield prisma_1.prisma.store.findUnique({
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
function getStoreProducts(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { slug } = schema_1.StoreSlugParam.parse(req.params);
        const store = yield prisma_1.prisma.store.findUnique({ where: { slug } });
        if (!store)
            return res.status(404).json({ message: 'Store not found' });
        const query = schema_1.ProductSearchQuery.parse(req.query);
        const page = (_a = query.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = query.limit) !== null && _b !== void 0 ? _b : 20;
        const where = Object.assign(Object.assign({ storeId: store.id }, (query.q && { name: { contains: query.q, mode: 'insensitive' } })), { visibleMarket: true });
        const [items, total] = yield Promise.all([
            (0, product_service_1.listProducts)(Object.assign(Object.assign({}, query), { storeId: store.id, page, limit })),
            (0, product_service_1.countProducts)(where),
        ]);
        const dto = {
            items,
            meta: { total, page, pageSize: limit },
        };
        res.json(dto);
    });
}
