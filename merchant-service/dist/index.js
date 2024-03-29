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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (process.env.IS_TRACING_ENABLED == "true") {
    (0, tracer_1.init)("merchant-service", "development");
}
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = __importDefault(require("./services/auth"));
const faker_1 = require("@faker-js/faker");
const app = (0, express_1.default)();
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3001;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Express + TypeScript Server");
});
const apiRouter = express_1.default.Router();
const bottleNeckMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isBottleNeck = process.env.IS_BOTTLENECK_ENABLED == "true";
    if (!isBottleNeck) {
        return next();
    }
    else {
        yield new Promise((resolve) => setTimeout(resolve, 5000));
    }
});
const errorMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isError = process.env.IS_ERROR_ENABLED == "true";
    if (!isError) {
        return next();
    }
    else {
        return res.status(500).json({
            message: "Internal Server Error - This is generated error for testing",
        });
    }
});
apiRouter.use(errorMiddleware);
apiRouter.use(bottleNeckMiddleware);
const createMerchantInput = zod_1.z.object({
    name: zod_1.z.string().min(3),
});
apiRouter.get("/faker-data", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resp = yield auth_1.default.get(undefined, 200);
        for (let i = 0; i < 200; i++) {
            yield prisma.merchant.create({
                data: {
                    name: faker_1.faker.company.name(),
                    userId: resp.data.data[i].id,
                    levelId: 1,
                },
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            message: "Internal Server Error",
            errors: error,
            error_message: error.message,
        });
    }
    return res.status(200).json({
        data: "All data created successfully",
    });
}));
apiRouter.post("/merchants", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const { authorization } = req.headers;
        yield createMerchantInput.parseAsync({
            name,
        });
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        let merchant = yield prisma.merchant.create({
            data: {
                name,
                userId: user.id,
                levelId: 1,
            },
        });
        return res.status(200).json({
            message: "Merchant created successfully",
            data: merchant,
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
            message: "Internal Server Error",
            errors: err,
        });
    }
}));
apiRouter.get("/merchants", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        const merchantPrism = yield prisma.merchant.findMany({
            include: {
                level: true,
            },
        });
        const userIds = merchantPrism.map((merchant) => merchant.userId);
        const respUsers = yield auth_1.default.getByIds(userIds, authorization);
        const users = respUsers.data.data;
        let merchants = merchantPrism.map((merchant) => {
            const user = users.find((user) => user.id === merchant.userId);
            return {
                id: merchant.id,
                name: merchant.name,
                userId: merchant.userId,
                levelId: merchant.levelId,
                user,
                createdAt: merchant.createdAt,
                updatedAt: merchant.updatedAt,
                level: {
                    id: merchant.level.id,
                    name: merchant.level.name,
                    createdAt: merchant.level.createdAt,
                    updatedAt: merchant.level.updatedAt,
                },
            };
        });
        return res.status(200).json({
            message: "list of merchants",
            data: merchants,
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
            message: "Internal Server Error",
            errors: err,
        });
    }
}));
apiRouter.get("/merchants/in", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { ids, } = req.query;
        // convert to number of array
        const idsArr = ids === null || ids === void 0 ? void 0 : ids.split(",").map((id) => Number(id));
        const merchants = yield prisma.merchant.findMany({
            where: {
                id: {
                    in: idsArr,
                },
            },
        });
        return res.status(200).json({
            message: "list of merchants",
            data: merchants,
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
            message: "Internal Server Error",
            errors: err,
        });
    }
}));
apiRouter.get("/merchants/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let merchantPrism = yield prisma.merchant.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                level: true,
            },
        });
        if (!merchantPrism) {
            return res.status(404).json({
                message: "Merchant not found",
            });
        }
        const respUser = yield auth_1.default.getById(merchantPrism.userId, authorization);
        const user = respUser.data.data;
        const merchant = {
            id: merchantPrism.id,
            name: merchantPrism.name,
            userId: merchantPrism.userId,
            levelId: merchantPrism.levelId,
            user,
            createdAt: merchantPrism.createdAt,
            updatedAt: merchantPrism.updatedAt,
            level: {
                id: merchantPrism.level.id,
                name: merchantPrism.level.name,
                createdAt: merchantPrism.level.createdAt,
                updatedAt: merchantPrism.level.updatedAt,
            },
        };
        // convert merchant to Merchant type
        return res.status(200).json({
            message: "list of merchants",
            data: merchant,
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
            message: "Internal Server Error",
            errors: err,
        });
    }
}));
apiRouter.get("/public/merchants/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        let merchantPrism = yield prisma.merchant.findUnique({
            where: {
                id: Number(id),
            },
            select: {
                id: true,
                name: true,
                levelId: true,
                level: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!merchantPrism) {
            return res.status(404).json({
                message: "Merchant not found",
            });
        }
        return res.status(200).json({
            message: "Merchant fetched successfully",
            data: merchantPrism,
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
            message: "Internal Server Error",
            errors: err,
        });
    }
}));
app.use("/api/merchant", apiRouter);
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
