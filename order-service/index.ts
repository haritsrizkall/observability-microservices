import { init } from './pkg/tracer';

init('order-service', 'development');

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { Order, OrderStatus, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import AuthService from './services/auth';
import { Merchant, User } from './utils/types';
import CatalogService from './services/catalog';
import MerchantService from './services/merchant';
import PaymentService from './services/payment';
const { trace } = require('@opentelemetry/api');

dotenv.config();

const app: Express = express();
const port = process.env.PORT ?? 3001;
const prisma = new PrismaClient();

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Order Service');
});

const apiRouter = express.Router();

const createOrderInput = z.object({
    merchantId: z.number(),
    orderItems: z.array(z.object({
        productId: z.number(),
        quantity: z.number(),
    })),
});
apiRouter.post('/orders', async (req: Request, res: Response) => {
    try {
        // const activeSpan = trace.getActiveSpan()
        // activeSpan.addEvent('create order')
        // activeSpan.setAttribute('haha', 'hihi')
        // currentSpan?.addEvent('create order');
        const { merchantId, orderItems } = req.body;
        const { authorization } = req.headers;
        await createOrderInput.parseAsync({
            merchantId,
            orderItems,
        });
        // get user 
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
        // currentSpan?.setAttribute("user", user.id)
        // get products
        let productIds = orderItems.map((item: any) => item.productId);
        let productsResp = await CatalogService.getByIds(productIds, authorization);
        let products = productsResp.data.data as any[];
        if (products.length != productIds.length) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Some products are not found",
            });
        }     
        // check if products are from the same merchant
        let merchantIds = products.map((product: any) => product.merchantId);
        let merchantIdSet = new Set(merchantIds);
        if (merchantIdSet.size > 1) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Products are not from the same merchant",
            });
        }
        // check if merchant exists
        let merchantResp = await MerchantService.getById(merchantId, authorization);
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
        let tax = subtotal * taxPercent / 100;
        let total = subtotal + tax;
        // create order
        const newOrder = {
            userId: user.id,
            merchantId,
            subtotal,
            tax,
            total,
            orderItems: {
                create: orderItems.map((item: any) => ({
                    name : products.find((product: any) => product.id == item.productId).name,
                    price: products.find((product: any) => product.id == item.productId).price,
                    quantity: item.quantity,
                    total: products.find((product: any) => product.id == item.productId).price * item.quantity,
                })),
            },
            status: OrderStatus.CREATED,
        }
        let order = await prisma.order.create({
            data: newOrder,
            include: {
                orderItems: true,
            }
        });
        console.log("kakkakaka")
        // create payment
        const newPayment = {
            order_id: order.id,
            amount: total,
        }
        console.log("newPayment ", newPayment)
        let respPayment = await PaymentService.create(newPayment, authorization);
        console.log(respPayment)
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
    }catch (err: any) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
        if (err instanceof z.ZodError) {
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
});
apiRouter.get('/orders/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
        // check if order exists
        const order = await prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        })
        if (!order) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order not found",
            });
        }
        const merchantResp = await MerchantService.getById(order.merchantId, authorization);
        const merchant = merchantResp.data.data as Merchant;
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
    }catch (err: any) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
        if (err instanceof z.ZodError) {
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
})

apiRouter.post('/orders/:id/cancel', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
        // check if order exists
        const order = await prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        })
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
        if (order.status != OrderStatus.CREATED) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order is already cancelled",
            });
        }
        // cancel order
        let cancelledOrder = await prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: OrderStatus.CANCELLED,
            },
        });
        return res.status(200).json({
            message: "Success cancel order",
            data: cancelledOrder,
        });
    }catch (err: any) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
        if (err instanceof z.ZodError) {
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
});

apiRouter.post('/orders/:id/paid', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
        // check if order exists
        const order = await prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        })
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
        if (order.status != OrderStatus.CREATED) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order cannot be paid",
            });
        }
        // pay order
        let paidOrder = await prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: OrderStatus.PAID,
            },
        });
        return res.status(200).json({
            message: "Success pay order",
            data: paidOrder,
        });
    }catch (err: any) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
        if (err instanceof z.ZodError) {
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
});

apiRouter.post('/orders/:id/complete', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { authorization } = req.headers;
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
        // check if order exists
        const order = await prisma.order.findUnique({
            where: {
                id: Number(id),
            },
        })
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
        if (order.status != OrderStatus.PAID) {
            return res.status(400).json({
                message: "Bad Request",
                errors: "Order cannot be completed",
            });
        }
        // pay order
        let paidOrder = await prisma.order.update({
            where: {
                id: Number(id),
            },
            data: {
                status: OrderStatus.COMPLETED,
            },
        });
        return res.status(200).json({
            message: "Success pay order",
            data: paidOrder,
        });
    }catch (err: any) {
        // if axios error
        if (err.response) {
            return res.status(err.response.status).json({
                message: err.response.data.message,
                errors: err.response.data.errors,
            });
        }
        if (err instanceof z.ZodError) {
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
});


app.use('/api/order', apiRouter);

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});