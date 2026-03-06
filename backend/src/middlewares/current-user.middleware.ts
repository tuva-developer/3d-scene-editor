import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

export const resolveCurrentUser: RequestHandler = async (req, res, next) => {
  try {
    const externalIdRaw = req.header("x-user-id")?.trim();
    const usernameRaw = req.header("x-user-name")?.trim();

    if (!externalIdRaw || externalIdRaw.length === 0) {
      req.currentUser = undefined;
      return next();
    }

    const user =
      (await prisma.user.findUnique({
        where: { externalId: externalIdRaw },
      })) ||
      (await prisma.user.findUnique({
        where: { id: externalIdRaw },
      }));

    if (!user) {
      req.currentUser = undefined;
      return next();
    }

    if (usernameRaw && usernameRaw.length > 0 && usernameRaw !== user.username) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { username: usernameRaw },
      });
      req.currentUser = updated;
      return next();
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
