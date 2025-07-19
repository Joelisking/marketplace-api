/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';
const ACCESS_EXP = (process.env.JWT_EXPIRES_IN || '15m');
const REFRESH_EXP = (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
const SECRET = process.env.JWT_SECRET;
export function signAccess(user) {
    return jwt.sign(user, SECRET, { expiresIn: ACCESS_EXP });
}
export function signRefresh(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXP });
}
export function verifyToken(token) {
    return jwt.verify(token, SECRET);
}
