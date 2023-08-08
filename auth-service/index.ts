import { init } from "./pkg/tracer";
import dotenv from "dotenv";

dotenv.config();

if (process.env.IS_TRACING_ENABLED == "true") {
  init("auth-service", "development");
}

import express, { Express, Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import opentelemetry from "@opentelemetry/api";
import { faker } from "@faker-js/faker";

const app: Express = express();
const portExpress = process.env.PORT ?? 3000;
const prisma = new PrismaClient();

console.log("special edition 1 span");

app.use(express.json());
app.get("/faker-data", async (req: Request, res: Response) => {
  try {
    for (let i = 0; i < 990; i++) {
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: faker.internet.password(),
          roleId: 2,
          profile: {
            create: {
              name: faker.name.fullName(),
            },
          },
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal Server Error",
      errors: error,
      error_message: error.message,
    });
  }
  return res.status(200).json({
    data: "All data created successfully",
  });
});
app.get("/", (req: Request, res: Response) => {
  const db_url = process.env.DATABASE_URL;
  const port = process.env.PORT;
  res.send("Express + TypeScript Server, " + db_url + " - " + port);
});

const apiRouter = express.Router();

const bottleNeckMiddleware = async (req: Request, res: Response, next: any) => {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  return next();
};

const errorMiddleware = async (req: Request, res: Response, next: any) => {
  return res.status(500).json({
    message: "Internal Server Error - This is generated error for testing",
  });
};
const isError = process.env.IS_ERROR_ENABLED == "true";
const isBottleNeck = process.env.IS_BOTTLENECK_ENABLED == "true";

if (isError) {
  apiRouter.use(errorMiddleware);
}

if (isBottleNeck) {
  apiRouter.use(bottleNeckMiddleware);
}

const registerInput = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

apiRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    await registerInput.parseAsync({
      email,
      password,
      name,
    });
    let user = await prisma.user.create({
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

apiRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
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
        message: "Email or not found",
      });
    }
    if (password !== user.password) {
      return res.status(400).json({
        message: "Email or password is incorrect",
      });
    }
    const token = jsonwebtoken.sign(
      {
        userId: user.id,
      },
      "skripsi-auth"
    );
    return res.status(200).json({
      message: "Login successfully",
      data: {
        token,
        user,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

apiRouter.post("/self-authorization", async (req: Request, res: Response) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const token = authorization.split(" ")[1];
    const decoded = jsonwebtoken.verify(token, "skripsi-auth") as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

apiRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const token = authorization.split(" ")[1];
    const decoded = jsonwebtoken.verify(token, "skripsi-auth") as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

apiRouter.get("/users", async (req: Request, res: Response) => {
  const { count } = req.query;
  try {
    const users = await prisma.user.findMany({
      take: count ? parseInt(count as string) : undefined,
    });
    return res.status(200).json({
      message: "Users found",
      data: users,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

apiRouter.get("/users/in", async (req: Request, res: Response) => {
  try {
    const {
      ids,
    }: {
      ids?: string;
    } = req.query;
    const users = await prisma.user.findMany({
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

apiRouter.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
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
  } catch (err: any) {
    if (err instanceof z.ZodError) {
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
});

app.use("/api/auth", apiRouter);

app.listen(portExpress, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${portExpress}`
  );
});
