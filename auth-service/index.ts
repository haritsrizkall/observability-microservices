import { init } from './pkg/tracer';

init('auth-service', 'development');

import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';

dotenv.config();


const app: Express = express();
const port = process.env.PORT ?? 3000;
const prisma = new PrismaClient();


app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

const apiRouter = express.Router();


const registerInput = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

apiRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    await registerInput.parseAsync({
      email,
      password,
      name,
    });
    const hashPassword = await bcrypt.hash(password, 10);
    let user = await prisma.user.create({
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
  } catch (err: any) {
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

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

apiRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    await loginInput.parseAsync({
      email,
      password,
    });
    let user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: 'Email or not found',
      });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: 'Email or password is incorrect',
      });
    }
    const token = jsonwebtoken.sign({
      userId: user.id,
    }, "skripsi-auth")
    return res.status(200).json({
      message: 'Login successfully',
      data: {
        token,
        user,
      },
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

apiRouter.post('/self-authorization', async (req: Request, res: Response) => {
  try {
    const { authorization } = req.headers
    if (!authorization) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }
    const token = authorization.split(' ')[1]
    const decoded = jsonwebtoken.verify(token, "skripsi-auth") as {
      userId: string
    }
    const user = await prisma.user.findUnique({
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

apiRouter.get('/me', async (req: Request, res: Response) => { 
  try {
    const { authorization } = req.headers
    if (!authorization) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }
    const token = authorization.split(' ')[1]
    const decoded = jsonwebtoken.verify(token, "skripsi-auth") as {
      userId: string
    }
    const user = await prisma.user.findUnique({
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

apiRouter.get('/users/in', async (req: Request, res: Response) => {
  try {
    const { ids }: {
      ids?: string
    } = req.query
    const users = await prisma.user.findMany({
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

apiRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
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
  }catch(err: any) {
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


app.use('/api/auth', apiRouter);


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});