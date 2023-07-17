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
    (0, tracer_1.init)("order-service", "development");
}
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = __importDefault(require("./services/auth"));
const catalog_1 = __importDefault(require("./services/catalog"));
const merchant_1 = __importDefault(require("./services/merchant"));
const payment_1 = __importDefault(require("./services/payment"));
const { trace } = require("@opentelemetry/api");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3001;
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Order Service");
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
const createOrderInput = zod_1.z.object({
    merchantId: zod_1.z.number(),
    orderItems: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.number(),
        quantity: zod_1.z.number(),
    })),
});
apiRouter.post("/orders", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const activeSpan = trace.getActiveSpan()
        // activeSpan.addEvent('create order')
        // activeSpan.setAttribute('haha', 'hihi')
        // currentSpan?.addEvent('create order');
        const { merchantId, orderItems } = req.body;
        const { authorization } = req.headers;
        yield createOrderInput.parseAsync({
            merchantId,
            orderItems,
        });
        // get user
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        // currentSpan?.setAttribute("user", user.id)
        // get products
        let productIds = orderItems.map((item) => item.productId);
        let productsResp = yield catalog_1.default.getByIds(productIds, authorization);
        let products = productsResp.data.data;
        if (products.length != productIds.length) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Some products are not found",
            });
        }
        // check if products are from the same merchant
        let merchantIds = products.map((product) => product.merchantId);
        let merchantIdSet = new Set(merchantIds);
        if (merchantIdSet.size > 1) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Products are not from the same merchant",
            });
        }
        // check if merchant exists
        let merchantResp = yield merchant_1.default.getById(merchantId, authorization);
        if (merchantResp.status != 200) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Merchant not found",
            });
        }
        // count total price
        let subtotal = 0;
        for (let i = 0; i < products.length; i++) {
            let product = products[i];
            let orderItem = orderItems[i];
            subtotal += product.price * orderItem.quantity;
        }
        let taxPercent = 11;
        let tax = (subtotal * taxPercent) / 100;
        let total = subtotal + tax;
        // create order
        const newOrder = {
            userId: user.id,
            merchantId,
            subtotal,
            tax,
            total,
            orderItems: {
                create: orderItems.map((item) => ({
                    name: products.find((product) => product.id == item.productId)
                        .name,
                    price: products.find((product) => product.id == item.productId)
                        .price,
                    quantity: item.quantity,
                    total: products.find((product) => product.id == item.productId)
                        .price * item.quantity,
                })),
            },
            status: client_1.OrderStatus.CREATED,
        };
        let order = yield prisma.order.create({
            data: newOrder,
            include: {
                orderItems: true,
            },
        });
        console.log("kakkakaka");
        // create payment
        const newPayment = {
            order_id: order.id,
            amount: total,
        };
        console.log("newPayment ", newPayment);
        let respPayment = yield payment_1.default.create(newPayment, authorization);
        console.log(respPayment);
        if (respPayment.status != 200) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Payment failed",
            });
        }
        return res.status(200).json({
            message: "Success create order",
            data: order,
        });
    }
    catch (err) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
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
apiRouter.get("/orders/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        // check if order exists
        const order = yield prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        });
        if (!order) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order not found",
            });
        }
        const merchantResp = yield merchant_1.default.getById(order.merchantId, authorization);
        const merchant = merchantResp.data.data;
        // check if order belongs to user
        if (order.userId != user.id || merchant.id != order.merchantId) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is not yours",
            });
        }
        return res.status(200).json({
            message: "Success get order",
            data: order,
        });
    }
    catch (err) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
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
apiRouter.post("/orders/:id/cancel", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        // check if order exists
        const order = yield prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        });
        if (!order) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order not found",
            });
        }
        // check if order belongs to user
        if (order.userId != user.id) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is not yours",
            });
        }
        // check if order is already cancelled
        if (order.status != client_1.OrderStatus.CREATED) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is already cancelled",
            });
        }
        // cancel order
        let cancelledOrder = yield prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: client_1.OrderStatus.CANCELLED,
            },
        });
        return res.status(200).json({
            message: "Success cancel order",
            data: cancelledOrder,
        });
    }
    catch (err) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
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
apiRouter.post("/orders/:id/paid", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        // check if order exists
        const order = yield prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        });
        if (!order) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order not found",
            });
        }
        // check if order belongs to user
        if (order.userId != user.id) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is not yours",
            });
        }
        // check if order is can be paid
        if (order.status != client_1.OrderStatus.CREATED) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order cannot be paid",
            });
        }
        // pay order
        let paidOrder = yield prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: client_1.OrderStatus.PAID,
            },
        });
        return res.status(200).json({
            message: "Success pay order",
            data: paidOrder,
        });
    }
    catch (err) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
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
apiRouter.post("/orders/:id/complete", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = yield auth_1.default.me(authorization);
        let user = resp.data.data;
        // check if order exists
        const order = yield prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        });
        if (!order) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order not found",
            });
        }
        // check if order belongs to user
        if (order.userId != user.id) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is not yours",
            });
        }
        // check if order is can be paid
        if (order.status != client_1.OrderStatus.PAID) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order cannot be completed",
            });
        }
        // pay order
        let paidOrder = yield prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: client_1.OrderStatus.COMPLETED,
            },
        });
        return res.status(200).json({
            message: "Success pay order",
            data: paidOrder,
        });
    }
    catch (err) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
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
app.use("/api/order", apiRouter);
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
