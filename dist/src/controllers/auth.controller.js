var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
import { RegisterBody, LoginBody, RefreshBody } from '../schema';
import { signAccess, signRefresh, verifyToken } from '../utils/jwt';
export function register(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = RegisterBody.parse(req.body);
        const exists = yield prisma.user.findUnique({ where: { email: body.email } });
        if (exists)
            return res.status(409).json({ message: 'Email already in use' });
        const password = yield bcrypt.hash(body.password, 10);
        const user = yield prisma.user.create({
            data: { email: body.email, password, role: 'CUSTOMER' },
        });
        const accessToken = signAccess(user);
        const refreshToken = signRefresh({ sub: user.id });
        const response = { accessToken, refreshToken, user };
        res.status(201).json(response);
    });
}
export function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = LoginBody.parse(req.body);
        const user = yield prisma.user.findUnique({ where: { email: body.email } });
        if (!user || !(yield bcrypt.compare(body.password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const accessToken = signAccess(user);
        const refreshToken = signRefresh({ sub: user.id });
        const response = { accessToken, refreshToken, user };
        res.json(response);
    });
}
export function refresh(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { refreshToken } = RefreshBody.parse(req.body);
        const decoded = verifyToken(refreshToken);
        const user = yield prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user)
            return res.status(401).json({ message: 'Invalid token' });
        const accessToken = signAccess(user);
        const newRefresh = signRefresh({ sub: user.id });
        const response = { accessToken, refreshToken: newRefresh, user };
        res.json(response);
    });
}
export function getAllUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield prisma.user.findMany();
        res.json(users);
    });
}
export function me(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Get fresh user data from database
        const freshUser = yield prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                role: true,
                storeId: true,
            },
        });
        if (!freshUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const response = freshUser;
        res.json(response);
    });
}
