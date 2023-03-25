import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';
import AuthService from './services/auth';
import { Merchant, User } from './utils/types';

dotenv.config();

const app: Express = express();
const port = process.env.PORT ?? 3001;
const prisma = new PrismaClient();

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

const apiRouter = express.Router();

const createMerchantInput = z.object({
  name: z.string().min(3),
});


apiRouter.post('/merchants', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const { authorization } = req.headers;
    await createMerchantInput.parseAsync({
      name,
    });
    let resp = await AuthService.me(authorization);
    let user = resp.data.data as User
    let merchant = await prisma.merchant.create({
      data: {
        name,
        userId: user.id,
        levelId: 1,
      },
    });
    return res.status(200).json({
      message: 'Merchant created successfully',
      data: merchant,
    });
  }catch (err: any) {
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
});

apiRouter.get('/merchants', async (req: Request, res: Response) => {
  try {
    const { authorization } = req.headers;
    const merchantPrism = await prisma.merchant.findMany({
      include: {
        level: true,
      },
    });
    const userIds = merchantPrism.map((merchant) => merchant.userId);
    const respUsers = await AuthService.getByIds(userIds, authorization);
    const users = respUsers.data.data as User[];
    let merchants: Merchant[] = merchantPrism.map((merchant) => {
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
      }
    });
    return res.status(200).json({
      message: 'list of merchants',
      data: merchants,
    });
  }catch (err: any) {
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
});

apiRouter.get('/merchants/in', async (req: Request, res: Response) => {
  try {
    let { ids }: {
      ids?: string
    } = req.query;
    // convert to number of array
    const idsArr = ids?.split(',').map((id) => Number(id));
    const merchants = await prisma.merchant.findMany({
      where: {
        id: {
          in: idsArr
        },
      },
    });
    return res.status(200).json({
      message: 'list of merchants',
      data: merchants,
    });
  }catch (err: any) {
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
});

apiRouter.get('/merchants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { authorization } = req.headers;
    let merchantPrism = await prisma.merchant.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        level: true,
      },
    });
    if (!merchantPrism) {
      return res.status(404).json({
        message: 'Merchant not found',
      });
    }
    const respUser = await AuthService.getById(merchantPrism.userId, authorization);
    const user = respUser.data.data as User;
    const merchant: Merchant = {
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
    } 
    // convert merchant to Merchant type
    return res.status(200).json({
      message: 'list of merchants',
      data: merchant,
    });
  }catch (err: any) {
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
});

app.use('/api/merchant', apiRouter);


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});