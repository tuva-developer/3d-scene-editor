import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export const assetRouter = Router();

assetRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "file is required" });
    }

    const asset = await prisma.asset.create({
      data: {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.filename,
      },
    });

    res.status(201).json({
      id: asset.id,
      url: `/uploads/${asset.path}`,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
    });
  } catch (error) {
    next(error);
  }
});
