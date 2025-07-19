"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccess = signAccess;
exports.signRefresh = signRefresh;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_EXP = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const SECRET = process.env.JWT_SECRET;
function signAccess(user) {
    return jsonwebtoken_1.default.sign(user, SECRET, { expiresIn: ACCESS_EXP });
}
function signRefresh(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: REFRESH_EXP });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
