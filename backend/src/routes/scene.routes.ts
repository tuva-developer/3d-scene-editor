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
    const scenes = await prisma.scene.findMany({ orderBy: { updatedAt: "desc" } });
    res.json(scenes);
  } catch (error) {
    next(error);
  }
});

sceneRouter.get("/:id", async (req, res, next) => {
  try {
    const scene = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!scene) return res.status(404).json({ message: "scene not found" });
    res.json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.post("/", async (req, res, next) => {
  try {
    const payload = sceneSchema.parse(req.body);
    const scene = await prisma.scene.create({ data: payload });
    res.status(201).json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = sceneSchema.partial().parse(req.body);
    const scene = await prisma.scene.update({ where: { id: req.params.id }, data: payload });
    res.json(scene);
  } catch (error) {
    next(error);
  }
});

sceneRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.scene.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
