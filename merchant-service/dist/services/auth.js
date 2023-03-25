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
const axios_1 = __importDefault(require("axios"));
const API_URL = "http://localhost:3001/api/auth/";
const AuthService = {
    login: (email, password) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield axios_1.default.post(API_URL + "login", {
            email,
            password,
        });
        if (response.data.accessToken) {
            localStorage.setItem("user", JSON.stringify(response.data));
        }
        return response.data;
    }),
    me: (token) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield axios_1.default.get(API_URL + "me", {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response;
    }),
    getById: (id, token) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield axios_1.default.get(`${API_URL}/users/${id}`, {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response;
    }),
    getByIds: (ids, token) => __awaiter(void 0, void 0, void 0, function* () {
        let userIds = ids.join(",");
        const response = yield axios_1.default.get(`${API_URL}/users/in`, {
            headers: {
                Authorization: `${token}`,
            },
            params: {
                ids: userIds,
            },
        });
        return response;
    })
};
exports.default = AuthService;
