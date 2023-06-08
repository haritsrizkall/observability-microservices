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
(0, tracer_1.init)('auth-service', 'development');
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const { endpoint, port } = exporter_prometheus_1.PrometheusExporter.DEFAULT_OPTIONS;
const exporter = new exporter_prometheus_1.PrometheusExporter({}, () => {
    console.log(`prometheus scrape endpoint: http://localhost:${port}${endpoint}`);
});
// Creates MeterProvider and installs the exporter as a MetricReader
const meterProvider = new sdk_metrics_1.MeterProvider();
meterProvider.addMetricReader(exporter);
const meter = meterProvider.getMeter('example-prometheus');
const loginCounter = meter.createCounter('login', {
    description: 'Login Counter',
});
dotenv_1.default.config();
const app = (0, express_1.default)();
const portExpress = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Express + TypeScript Server');
});
const apiRouter = express_1.default.Router();
const registerInput = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
apiRouter.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        yield registerInput.parseAsync({
            email,
            password,
            name,
        });
        const hashPassword = yield bcrypt_1.default.hash(password, 10);
        let user = yield prisma.user.create({
            data: {
                email,
                password: hashPassword,
                roleId: 2,
                profile: {
                    create: {
                        name,
                    },
                }
            },
        });
        return res.status(200).json({
            message: 'User created successfully',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
const loginInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
apiRouter.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("login");
        loginCounter.add(1, {
            email: req.body.email,
            password: req.body.password,
        });
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
                message: 'Email or not found',
            });
        }
        const isPasswordCorrect = yield bcrypt_1.default.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: 'Email or password is incorrect',
            });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
        }, "skripsi-auth");
        return res.status(200).json({
            message: 'Login successfully',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.post('/self-authorization', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        const token = authorization.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, "skripsi-auth");
        const user = yield prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        return res.status(200).json({
            message: 'Authorized',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/me', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authorization } = req.headers;
        if (!authorization) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        const token = authorization.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, "skripsi-auth");
        const user = yield prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }
        return res.status(200).json({
            message: 'Authorized',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/users/in', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.query;
        const users = yield prisma.user.findMany({
            where: {
                id: {
                    in: ids ? ids.split(',') : [],
                },
            },
        });
        return res.status(200).json({
            message: 'Users foundss',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
apiRouter.get('/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: {
                id: req.params.id,
            },
        });
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }
        return res.status(200).json({
            message: 'User found',
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
            message: 'Internal Server Error',
            errors: err,
        });
    }
}));
app.use('/api/auth', apiRouter);
app.listen(portExpress, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${portExpress}`);
});
