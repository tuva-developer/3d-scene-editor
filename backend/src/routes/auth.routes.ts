import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { username: payload.username, password: payload.password },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    return res.json({
      user: {
        id: user.id,
        externalId: user.externalId,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
});
