import { init } from './pkg/tracer';

init('order-service', 'development');

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

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
    }catch (err: any) {
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

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});