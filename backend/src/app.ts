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

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "internal server error";
    console.error("[api-error]", message);
    res.status(500).json({ message });
  });

  return app;
}
