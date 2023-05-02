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
const API_URL = "http://localhost:3003/api/merchant/";
const MerchantService = {
    getById: (id, token) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield axios_1.default.get(`${API_URL}/merchants/${id}`, {
            headers: {
                Authorization: `${token}`,
            },
        });
        return response;
    }),
    getByIds: (ids, token) => __awaiter(void 0, void 0, void 0, function* () {
        let merchantIds = ids.join(",");
        const response = yield axios_1.default.get(`${API_URL}/merchants/in`, {
            headers: {
                Authorization: `${token}`,
            },
            params: {
                ids: merchantIds,
            },
        });
        return response;
    }),
    getByIdPublic: (id) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield axios_1.default.get(`${API_URL}/public/merchants/${id}`);
        return response;
    })
};
exports.default = MerchantService;
