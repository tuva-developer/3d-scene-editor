import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 4000);
const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

fs.mkdirSync(path.resolve(uploadDir), { recursive: true });

const app = createApp();
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
