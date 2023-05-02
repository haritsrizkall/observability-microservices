import { init } from './pkg/tracer';

init('order-service', 'development');

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import AuthService from './services/auth';
import { User } from './utils/types';
import CatalogService from './services/catalog';
import MerchantService from './services/merchant';

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
        const { merchantId, orderItems } = req.body;
        const { authorization } = req.headers;
        await createOrderInput.parseAsync({
            merchantId,
            orderItems,
        });
        // get user 
        let resp = await AuthService.me(authorization);
        let user = resp.data.data as User
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
            }
        }
        let order = await prisma.order.create({
            data: newOrder,
            include: {
                orderItems: true,
            }
        });

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

app.use('/api/order', apiRouter);

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});