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
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.getAllUsers = getAllUsers;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
const schema_1 = require("../schema");
const jwt_1 = require("../utils/jwt");
function register(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = schema_1.RegisterBody.parse(req.body);
        const exists = yield prisma.user.findUnique({ where: { email: body.email } });
        if (exists)
            return res.status(409).json({ message: 'Email already in use' });
        const password = yield bcrypt_1.default.hash(body.password, 10);
        const user = yield prisma.user.create({
            data: { email: body.email, password, role: 'CUSTOMER' },
        });
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)({ sub: user.id });
        const response = { accessToken, refreshToken, user };
        res.status(201).json(response);
    });
}
function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = schema_1.LoginBody.parse(req.body);
        const user = yield prisma.user.findUnique({ where: { email: body.email } });
        if (!user || !(yield bcrypt_1.default.compare(body.password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const accessToken = (0, jwt_1.signAccess)(user);
        const refreshToken = (0, jwt_1.signRefresh)({ sub: user.id });
        const response = { accessToken, refreshToken, user };
        res.json(response);
    });
}
function refresh(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { refreshToken } = schema_1.RefreshBody.parse(req.body);
        const decoded = (0, jwt_1.verifyToken)(refreshToken);
        const user = yield prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user)
            return res.status(401).json({ message: 'Invalid token' });
        const accessToken = (0, jwt_1.signAccess)(user);
        const newRefresh = (0, jwt_1.signRefresh)({ sub: user.id });
        const response = { accessToken, refreshToken: newRefresh, user };
        res.json(response);
    });
}
function getAllUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield prisma.user.findMany();
        res.json(users);
    });
}
