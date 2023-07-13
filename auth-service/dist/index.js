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
    (0, tracer_1.init)("auth-service", "development");
}
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const faker_1 = require("@faker-js/faker");
const app = (0, express_1.default)();
const portExpress = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.get("/faker-data", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        for (let i = 0; i < 990; i++) {
            const user = yield prisma.user.create({
                data: {
                    email: faker_1.faker.internet.email(),
                    password: faker_1.faker.internet.password(),
                    roleId: 2,
                    profile: {
                        create: {
                            name: faker_1.faker.name.fullName(),
                        },
                    },
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
app.get("/", (req, res) => {
    const db_url = process.env.DATABASE_URL;
    const port = process.env.PORT;
    res.send("Express + TypeScript Server, " + db_url + " - " + port);
});
const apiRouter = express_1.default.Router();
const bottleNeckMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isBottleNeck = process.env.IS_BOTTLENECK_ENABLED == "true";
    if (!isBottleNeck) {
        return next();
    }
    else {
        yield new Promise((resolve) => setTimeout(resolve, 5000));
        return next();
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
const registerInput = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
apiRouter.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        yield registerInput.parseAsync({
            email,
            password,
            name,
        });
        let user = yield prisma.user.create({
            data: {
                email,
                password: password,
                roleId: 2,
                profile: {
                    create: {
                        name,
                    },
                },
            },
        });
        return res.status(200).json({
            message: "User created successfully",
            data: user,
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
const loginInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
apiRouter.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        yield loginInput.parseAsync({
            email,
            password,
        });
        let user = yield prisma.user.findUnique({
            where: {
                email,
            },
        });
        if (!user) {
            return res.status(400).json({
                message: "Email or not found",
            });
        }
        if (password !== user.password) {
            return res.status(400).json({
                message: "Email or password is incorrect",
            });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
        }, "skripsi-auth");
        return res.status(200).json({
            message: "Login successfully",
            data: {
                token,
                user,
            },
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
apiRouter.post("/self-authorization", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const token = authorization.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, "skripsi-auth");
        const user = yield prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        return res.status(200).json({
            message: "Authorized",
            data: user,
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
apiRouter.get("/me", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const token = authorization.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, "skripsi-auth");
        const user = yield prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        return res.status(200).json({
            message: "Authorized",
            data: user,
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
apiRouter.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { count } = req.query;
    try {
        const users = yield prisma.user.findMany({
            take: count ? parseInt(count) : undefined,
        });
        return res.status(200).json({
            message: "Users found",
            data: users,
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
apiRouter.get("/users/in", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, } = req.query;
        const users = yield prisma.user.findMany({
            where: {
                id: {
                    in: ids ? ids.split(",") : [],
                },
            },
        });
        return res.status(200).json({
            message: "Users foundss",
            data: users,
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
apiRouter.get("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: {
                id: req.params.id,
            },
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.status(200).json({
            message: "User found",
            data: user,
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
app.use("/api/auth", apiRouter);
app.listen(portExpress, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${portExpress}`);
});
