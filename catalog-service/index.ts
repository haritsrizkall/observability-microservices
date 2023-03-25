import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';
import MerchantService from './services/merchant';
import { AxiosError } from 'axios';
import { Merchant } from './utils/types';

dotenv.config();


const app: Express = express();
const port = process.env.PORT ?? 3000;
const prisma = new PrismaClient();

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

const apiRouter = express.Router();

interface RequestWithUser extends Request {
  userId?: string;
}

const authMiddleware = async (req: RequestWithUser, res: Response, next: any) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }
  const token = authorization.split(' ')[1];
  try {
    const decoded = jsonwebtoken.verify(token, "skripsi-auth") as {
      userId: string
    }
    req.userId = decoded.userId; 
    next();
  }catch (err: any) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }
}

const createProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  merchantId: z.number(),
  categoryId: z.number(),
});


apiRouter.post('/products', authMiddleware, async (req: RequestWithUser, res: Response) => {
  const {
    name,
    description,
    price,
    merchantId,
    categoryId,
  } = req.body;
  const { authorization } = req.headers;
  try {
    await createProductSchema.parseAsync({
      name,
      description,
      price,
      merchantId,
      categoryId,
    });
    // check if merchant exists
    const merchantResp = await MerchantService.getById(merchantId, authorization);
    const merchant = merchantResp.data.data as Merchant
    if (merchant.userId !== req.userId) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }
    // check if user authorized to create product
    const product = await prisma.product.create({
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
  }catch (err: any) {
    if (err instanceof z.ZodError) {
      console.log(err);
      return res.status(400).json({ 
        message: "Bad Request",
        errors: err.errors,
       });
    }
    if (err instanceof AxiosError) {
      console.log(err);
      return res.status(400).json({ 
        ...err.response?.data,
       });
    }
    return  res.status(500).json({
      message: 'Internal Server Error',
      errors: err,
    });
  }
});

apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { authorization } = req.headers;
    const productsPrism = await prisma.product.findMany({
      include: {
        category: true,
      },
    });
    const merchantIds = productsPrism.map((product: any) => product.merchantId);
    const merchantResp = await MerchantService.getByIds(merchantIds, authorization);
    const merchants = merchantResp.data.data as Merchant[];
    let products = productsPrism.map((product: any) => {
      const merchant = merchants.find((merchant: Merchant) => merchant.id === product.merchantId);
      return {
        ...product,
        merchant: {
          id: merchant?.id,
          name: merchant?.name,
        }
      }
    });
    return res.status(200).json({
      message: 'Products fetched successfully',
      data: products,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.log(err);
      return res.status(400).json({ 
        message: "Bad Request",
        errors: err.errors,
       });
    }
    return  res.status(500).json({
      message: 'Internal Server Error',
      errors: err,
    });
  }
})


app.use('/api/catalog', apiRouter);


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});