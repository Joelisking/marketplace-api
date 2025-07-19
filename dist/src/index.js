"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const openapi_1 = __importDefault(require("./openapi"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const catalogue_routes_1 = __importDefault(require("./routes/catalogue.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// TODO: mount your routers here
app.use('/docs', openapi_1.default);
app.use('/auth', auth_routes_1.default);
app.use('/', catalogue_routes_1.default);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: ['http://localhost:3000'] }));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
}));
const authLimiter = (0, express_rate_limit_1.default)({ windowMs: 60000, max: 20 });
app.use('/auth', authLimiter);
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`🚀 Listening on http://localhost:${port}`);
});
