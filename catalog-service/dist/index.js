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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const tracer_1 = require("./pkg/tracer");
(0, tracer_1.init)('catalog-service', 'development');
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const merchant_1 = __importDefault(require("./services/merchant"));
const axios_1 = require("axios");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Express + TypeScript Server');
});
const apiRouter = express_1.default.Router();
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({
            message: 'Unauthorized',
        });
    }
    const token = authorization.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, "skripsi-auth");
        req.userId = decoded.userId;
        next();
    }
    catch (err) {
        return res.status(401).json({
            message: 'Unauthorized',
        });
    }
});
const createProductSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    price: zod_1.z.number(),
    merchantId: zod_1.z.number(),
    categoryId: zod_1.z.number(),
});
apiRouter.post('/products', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { name, description, price, merchantId, categoryId, } = req.body;
    const { authorization } = req.headers;
    try {
        yield createProductSchema.parseAsync({
            name,
            description,
            price,
            merchantId,
            categoryId,
        });
        // check if merchant exists
        const merchantResp = yield merchant_1.default.getById(merchantId, authorization);
        const merchant = merchantResp.data.data;
        if (merchant.userId !== req.userId) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        // check if user authorized to create product
        const product = yield prisma.product.create({
            data: {
                name,
                description,
                price,
                merchantId,
                categoryId,
            },
        });
        return res.status(200).json({
            message: 'Product created successfully',
            data: product,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            console.log(err);
            return res.status(400).json({
                message: "Bad Request",
                errors: err.errors,
            });
        }
        if (err instanceof axios_1.AxiosError) {
            console.log(err);
            return res.status(400).json(Object.assign({}, (_b = err.response) === null || _b === void 0 ? void 0 : _b.data));
        }
        return res.status(500).json({
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/products', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        const productsPrism = yield prisma.product.findMany({
            include: {
                category: true,
            },
        });
        const merchantIds = productsPrism.map((product) => product.merchantId);
        const merchantResp = yield merchant_1.default.getByIds(merchantIds, authorization);
        const merchants = merchantResp.data.data;
        let products = productsPrism.map((product) => {
            const merchant = merchants.find((merchant) => merchant.id === product.merchantId);
            return Object.assign(Object.assign({}, product), { merchant: {
                    id: merchant === null || merchant === void 0 ? void 0 : merchant.id,
                    name: merchant === null || merchant === void 0 ? void 0 : merchant.name,
                } });
        });
        return res.status(200).json({
            message: 'Products fetched successfully',
            data: products,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            console.log(err);
            return res.status(400).json({
                message: "Bad Request",
                errors: err.errors,
            });
        }
        return res.status(500).json({
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/products/in', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { ids } = req.query;
        // convert to number of array
        const idsArr = ids.split(',').map((id) => Number(id));
        const products = yield prisma.product.findMany({
            where: {
                id: {
                    in: idsArr,
                },
            },
            include: {
                category: true,
            },
        });
        return res.status(200).json({
            message: 'Products fetched successfully',
            data: products,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            console.log(err);
            return res.status(400).json({
                message: "Bad Request",
                errors: err.errors,
            });
        }
        return res.status(500).json({
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/products/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const { id } = req.params;
        const product = yield prisma.product.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                category: true,
            },
        });
        const merchantResp = yield merchant_1.default.getByIdPublic((_c = product === null || product === void 0 ? void 0 : product.merchantId) !== null && _c !== void 0 ? _c : 0);
        const merchant = merchantResp.data.data;
        const productWithMerchant = Object.assign(Object.assign({}, product), { merchant: merchant });
        return res.status(200).json({
            message: 'Product fetched successfully',
            data: productWithMerchant,
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            console.log(err);
            return res.status(400).json({
                message: "Bad Request",
                errors: err.errors,
            });
        }
        return res.status(500).json({
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
app.use('/api/catalog', apiRouter);
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
