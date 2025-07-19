"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
let spec;
try {
    spec = yamljs_1.default.load(path_1.default.join(__dirname, '../openapi.yaml'));
}
catch (e) {
    spec = {};
}
router.use('/', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(spec));
exports.default = router;
