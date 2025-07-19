var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import request from 'supertest';
import { app } from './mocks/app';
describe('Catalogue', () => {
    it('lists products', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield request(app).get('/products');
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
    }));
    it('gets product by id', () => __awaiter(void 0, void 0, void 0, function* () {
        const { body } = yield request(app).get('/products');
        const product = body.items[0];
        const res = yield request(app).get(`/products/${product.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(product.id);
    }));
});
