"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ctrl = __importStar(require("../controllers/auth.controller"));
const openapi_1 = require("../lib/openapi");
const schema = __importStar(require("../schema"));
// OpenAPI registration for auth endpoints
openapi_1.registry.registerPath({
    method: 'post',
    path: '/auth/register',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.RegisterBody,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'User registered successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
        409: {
            description: 'Email already in use',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
openapi_1.registry.registerPath({
    method: 'post',
    path: '/auth/login',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.LoginBody,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'User logged in successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
openapi_1.registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: schema.RefreshBody,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Token refreshed successfully',
            content: {
                'application/json': {
                    schema: schema.AuthResponse,
                },
            },
        },
    },
});
const r = (0, express_1.Router)();
r.post('/register', ctrl.register);
r.post('/login', ctrl.login);
r.post('/refresh', ctrl.refresh);
r.get('/users', ctrl.getAllUsers);
exports.default = r;
