"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
const jwt_1 = require("../utils/jwt");
function authGuard(req, res, next) {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token)
        return res.status(401).json({ message: 'Missing token' });
    try {
        req.user = (0, jwt_1.verifyToken)(token); // Augment Express.Request in a `types/` declaration
        next();
    }
    catch (_a) {
        res.status(401).json({ message: 'Invalid token' });
    }
}
