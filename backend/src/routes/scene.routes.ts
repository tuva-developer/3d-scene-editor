import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const sceneSchema = z.object({
  name: z.string().min(1),
  configJson: z.any(),
  thumbnailId: z.string().optional().nullable(),
});

export const sceneRouter = Router();

sceneRouter.get("/", async (_req, res, next) => {
  try {
    if (!_req.currentUser) return res.status(401).json({ message: "unauthorized" });
    const scenes = await prisma.scene.findMany({
      where: { ownerId: _req.currentUser.id },
      orderBy: { updatedAt: "desc" },
    });
    res.json(scenes);
  } catch (error) {
    next(error);
  }
});

sceneRouter.get("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "unauthorized" });
    const scene = await prisma.scene.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
    });
    if (!scene) return res.status(404).json({ message: "scene not found" });
    res.json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.post("/", async (req, res, next) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "unauthorized" });
    const payload = sceneSchema.parse(req.body);
    if (payload.thumbnailId) {
      const thumbnail = await prisma.asset.findFirst({
        where: { id: payload.thumbnailId, ownerId: req.currentUser.id },
      });
      if (!thumbnail) {
        return res.status(400).json({ message: "thumbnail asset not found for current user" });
      }
    }
    const scene = await prisma.scene.create({
      data: {
        ownerId: req.currentUser.id,
        name: payload.name,
        configJson: payload.configJson,
        thumbnailId: payload.thumbnailId ?? null,
      },
    });
    res.status(201).json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.put("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "unauthorized" });
    const payload = sceneSchema.partial().parse(req.body);
    const exists = await prisma.scene.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ message: "scene not found" });
    }
    if (payload.thumbnailId) {
      const thumbnail = await prisma.asset.findFirst({
        where: { id: payload.thumbnailId, ownerId: req.currentUser.id },
      });
      if (!thumbnail) {
        return res.status(400).json({ message: "thumbnail asset not found for current user" });
      }
    }
    const scene = await prisma.scene.update({ where: { id: req.params.id }, data: payload });
    res.json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "unauthorized" });
    const exists = await prisma.scene.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
      select: { id: true },
    });
    if (!exists) {
      return res.status(404).json({ message: "scene not found" });
    }
    await prisma.scene.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
