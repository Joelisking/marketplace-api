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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Catalogue', () => {
    it('lists products', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/products');
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
    }));
    it('gets product by id', () => __awaiter(void 0, void 0, void 0, function* () {
        const { body } = yield (0, supertest_1.default)(index_1.app).get('/products');
        const product = body.items[0];
        const res = yield (0, supertest_1.default)(index_1.app).get(`/products/${product.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(product.id);
    }));
});
