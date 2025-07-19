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
// Jest test file
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Auth', () => {
    it('register → login → refresh', () => __awaiter(void 0, void 0, void 0, function* () {
        const email = `test${Date.now()}@mail.com`;
        const reg = yield (0, supertest_1.default)(index_1.app).post('/auth/register').send({ email, password: 'secret123' });
        expect(reg.status).toBe(201);
        const log = yield (0, supertest_1.default)(index_1.app).post('/auth/login').send({ email, password: 'secret123' });
        expect(log.body.accessToken).toBeDefined();
        const ref = yield (0, supertest_1.default)(index_1.app)
            .post('/auth/refresh')
            .send({ refreshToken: log.body.refreshToken });
        expect(ref.status).toBe(200);
    }));
});
