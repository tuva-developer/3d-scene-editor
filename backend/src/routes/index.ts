import { Router } from "express";
import { assetRouter } from "./asset.routes.js";
import { sceneRouter } from "./scene.routes.js";

export const router = Router();

router.use("/assets", assetRouter);
router.use("/scenes", sceneRouter);
