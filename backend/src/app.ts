import express from "express";
import cors from "cors";
import { router } from "./routes/index.js";
import { resolveCurrentUser } from "./middlewares/current-user.middleware.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN ?? true }));
  app.use(express.json({ limit: "25mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "scene-editor-backend" });
  });

  app.use("/api", resolveCurrentUser);
  app.use("/api", router);

  return app;
}
