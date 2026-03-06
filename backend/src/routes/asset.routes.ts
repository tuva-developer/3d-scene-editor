import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import axios from "axios";
import FormData from "form-data";
import { prisma } from "../lib/prisma.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
const remoteServiceUrl =
  process.env.FILE_SERVICE_URL?.trim() ||
  process.env.FILE_SERVICE_UPLOAD_URL?.trim() ||
  process.env.FILE_SERVICE_DELETE_URL?.trim() ||
  process.env.FILE_SERVICE_GET_URL?.trim() ||
  "";
const remoteTimeoutMs = Number(process.env.FILE_SERVICE_TIMEOUT_MS ?? 30000);
const modelStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_MODEL_KEY?.trim() || "/models",
);
const imageStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_IMAGE_KEY?.trim() || "/images",
);
const defaultStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_DEFAULT_KEY?.trim() || modelStorageKey,
);

function normalizeStorageKey(key: string): string {
  return key.startsWith("/") ? key : `/${key}`;
}

function toUserScopedKey(userId: string, key: string): string {
  const normalizedUser = userId.trim().replace(/^\/+|\/+$/g, "");
  const normalizedKey = normalizeStorageKey(key).replace(/^\/+/, "");
  if (!normalizedUser) {
    return `/${normalizedKey}`;
  }
  if (!normalizedKey) {
    return `/${normalizedUser}`;
  }
  return `/${normalizedUser}/${normalizedKey}`;
}

function isModelFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  const modelExts = new Set([
    ".glb",
    ".gltf",
    ".obj",
    ".fbx",
    ".stl",
    ".dae",
    ".3ds",
    ".usdz",
    ".ifc",
  ]);
  if (modelExts.has(ext)) {
    return true;
  }
  return file.mimetype.startsWith("model/") || file.mimetype.includes("gltf");
}

function isImageFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  const imageExts = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".tif",
    ".tiff",
    ".svg",
  ]);
  if (imageExts.has(ext)) {
    return true;
  }
  return file.mimetype.startsWith("image/");
}

function getAssetKind(file: Express.Multer.File): "MODEL" | "IMAGE" | "OTHER" {
  if (isImageFile(file)) {
    return "IMAGE";
  }
  if (isModelFile(file)) {
    return "MODEL";
  }
  return "OTHER";
}

function getStorageKeyForFile(file: Express.Multer.File): string {
  if (isImageFile(file)) {
    return imageStorageKey;
  }
  if (isModelFile(file)) {
    return modelStorageKey;
  }
  return defaultStorageKey;
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const assetRouter = Router();

function pickNestedString(source: unknown, paths: string[]): string | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  for (const pathName of paths) {
    const parts = pathName.split(".");
    let current: unknown = source;
    let ok = true;
    for (const part of parts) {
      if (!current || typeof current !== "object" || !(part in (current as Record<string, unknown>))) {
        ok = false;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (ok && typeof current === "string" && current.trim().length > 0) {
      return current.trim();
    }
  }
  return undefined;
}

async function uploadToRemoteStorage(
  file: Express.Multer.File,
  userId: string,
  keys: string[],
): Promise<{
  storagePath: string;
  raw: unknown;
}> {
  if (!remoteServiceUrl) {
    throw new Error("FILE_SERVICE_URL is not configured");
  }

  const formData = new FormData();
  formData.append("file", Buffer.from(file.buffer), {
    filename: file.originalname,
    contentType: file.mimetype || "application/octet-stream",
  });
  const normalizedKeys =
    keys.length > 0 ? keys.map(normalizeStorageKey) : [defaultStorageKey];
  const scopedKeys = normalizedKeys.map((key) => toUserScopedKey(userId, key));
  for (const key of scopedKeys) {
    formData.append("key", key);
  }
  try {
    const response = await axios.post(remoteServiceUrl, formData, {
      headers: formData.getHeaders(),
      timeout: remoteTimeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      const text =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);
      throw new Error(
        `Remote storage upload failed (${response.status}): ${text ?? ""}`,
      );
    }

    const raw = response.data;
    const rootRaw = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const storagePathDirect =
      pickNestedString(rootRaw, [
        "url",
        "path",
        "fileUrl",
        "filePath",
        "objectName",
        "key",
        "data.url",
        "data.path",
        "data.fileUrl",
        "data.filePath",
        "data.objectName",
        "data.key",
        "value.url",
        "value.path",
        "value.fileUrl",
        "value.filePath",
        "value.objectName",
        "value.key",
        "Value.url",
        "Value.path",
        "Value.fileUrl",
        "Value.filePath",
        "Value.objectName",
        "Value.key",
        "result.url",
        "result.path",
        "result.fileUrl",
        "result.filePath",
        "result.objectName",
        "result.key",
        "Result.url",
        "Result.path",
        "Result.fileUrl",
        "Result.filePath",
        "Result.objectName",
        "Result.key",
      ]) ||
      (typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined);

    let storagePath = storagePathDirect;
    if (!storagePath) {
      const fileName =
        pickNestedString(rootRaw, [
          "fileName",
          "filename",
          "name",
          "data.fileName",
          "data.filename",
          "data.name",
          "value.fileName",
          "value.filename",
          "value.name",
          "Value.fileName",
          "Value.filename",
          "Value.name",
          "result.fileName",
          "result.filename",
          "result.name",
          "Result.fileName",
          "Result.filename",
          "Result.name",
        ]) || file.originalname;
      const key =
        pickNestedString(rootRaw, ["key", "data.key", "value.key", "Value.key", "result.key", "Result.key"]) ||
        scopedKeys[0];
      if (fileName && key) {
        const normalizedKey = normalizeStorageKey(key);
        storagePath = `${normalizedKey.replace(/\/+$/, "")}/${fileName}`;
      }
    }

    if (!storagePath) {
      const rawText = typeof raw === "string" ? raw : JSON.stringify(raw);
      throw new Error(`Remote storage response missing url/path/key. Raw: ${rawText}`);
    }

    return { storagePath, raw };
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      throw new Error(
        `Remote storage upload timeout after ${remoteTimeoutMs}ms`,
      );
    }
    throw error;
  }
}

function resolveRemoteDeleteTarget(
  storagePath: string,
  keyOverride?: string,
): { fileName: string; key: string } | null {
  if (!storagePath) {
    return null;
  }
  let pathname = storagePath;
  try {
    if (/^https?:\/\//i.test(storagePath)) {
      const url = new URL(storagePath);
      pathname = url.pathname;
    }
  } catch {
    pathname = storagePath;
  }
  const fileName = path.posix.basename(pathname);
  if (!fileName || fileName === "." || fileName === "/") {
    return null;
  }
  const derivedKey = path.posix.dirname(pathname);
  const keyRaw = keyOverride?.trim() || derivedKey;
  const key = keyRaw.startsWith("/") ? keyRaw : `/${keyRaw}`;
  return { fileName, key };
}

async function deleteFromRemoteStorage(
  fileName: string,
  key: string,
): Promise<unknown> {
  if (!remoteServiceUrl) {
    throw new Error("FILE_SERVICE_URL is not configured");
  }
  const url = new URL(remoteServiceUrl);
  url.searchParams.set("fileName", fileName);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), remoteTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "DELETE",
      signal: controller.signal,
    });
    const rawText = await response.text();
    let raw: unknown = rawText;
    try {
      raw = JSON.parse(rawText);
    } catch {
      // keep raw text
    }
    if (!response.ok) {
      throw new Error(
        `Remote storage delete failed (${response.status}): ${rawText}`,
      );
    }
    return raw;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(
        `Remote storage delete timeout after ${remoteTimeoutMs}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getFromRemoteStorage(
  fileName: string,
  key: string,
): Promise<{
  bytes: Uint8Array;
  contentType: string;
  contentDisposition?: string | null;
}> {
  if (!remoteServiceUrl) {
    throw new Error("FILE_SERVICE_URL is not configured");
  }
  const url = new URL(remoteServiceUrl);
  url.searchParams.set("fileName", fileName);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), remoteTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Remote storage get failed (${response.status}): ${text}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType:
        response.headers.get("content-type") || "application/octet-stream",
      contentDisposition: response.headers.get("content-disposition"),
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`Remote storage get timeout after ${remoteTimeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleUploadAsset(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "file is required" });
    }
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const keyInput = req.body.key;
    const keys = (Array.isArray(keyInput) ? keyInput : [keyInput])
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const resolvedKeys =
      keys.length > 0 ? keys : [getStorageKeyForFile(req.file)];

    const uploaded = await uploadToRemoteStorage(
      req.file,
      req.currentUser.id,
      resolvedKeys,
    );
    const kind = getAssetKind(req.file);
    const nameInput =
      typeof req.body.name === "string" ? req.body.name.trim() : "";
    const fallbackName = req.file.originalname.replace(/\.[^/.]+$/, "").trim();
    const assetName = (nameInput || fallbackName || req.file.originalname).slice(
      0,
      255,
    );
    const asset = await prisma.asset.create({
      data: {
        ownerId: req.currentUser.id,
        kind,
        name: assetName,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: uploaded.storagePath,
      },
    });

    return res.status(201).json({
      id: asset.id,
      url: `/api/assets/${asset.id}/content`,
      name: asset.name,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      storagePath: asset.path,
      ownerId: asset.ownerId,
      remote: uploaded.raw,
    });
  } catch (error) {
    next(error);
  }
}

assetRouter.post("/upload", memoryUpload.single("file"), handleUploadAsset);

assetRouter.get("/", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const kindQuery =
      typeof req.query.kind === "string" ? req.query.kind.trim().toUpperCase() : "";
    const kindFilter =
      kindQuery === "MODEL" || kindQuery === "IMAGE" || kindQuery === "OTHER" ? kindQuery : undefined;
    const assets = await prisma.asset.findMany({
      where: {
        ownerId: req.currentUser.id,
        ...(kindFilter ? { kind: kindFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      assets.map((asset) => ({
        ...asset,
        url: `/api/assets/${asset.id}/content`,
      })),
    );
  } catch (error) {
    next(error);
  }
});

async function handleGetRemoteFile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const fileName =
      typeof req.query.fileName === "string" ? req.query.fileName.trim() : "";
    const keyRaw =
      typeof req.query.key === "string" ? req.query.key.trim() : "";
    const key = keyRaw.startsWith("/") ? keyRaw : `/${keyRaw}`;
    if (!fileName || !keyRaw) {
      return res.status(400).json({ message: "fileName and key are required" });
    }

    const ownerAsset = await prisma.asset.findFirst({
      where: {
        ownerId: req.currentUser.id,
        path: {
          endsWith: `/${fileName}`,
          contains: key,
        },
      },
    });
    if (!ownerAsset) {
      return res
        .status(404)
        .json({ message: "asset not found for current user" });
    }

    const remote = await getFromRemoteStorage(fileName, key);
    res.setHeader("Content-Type", remote.contentType);
    if (remote.contentDisposition) {
      res.setHeader("Content-Disposition", remote.contentDisposition);
    } else {
      res.setHeader(
        "Content-Disposition",
        `inline; filename=\"${encodeURIComponent(fileName)}\"`,
      );
    }
    return res.status(200).send(Buffer.from(remote.bytes));
  } catch (error) {
    next(error);
  }
}

assetRouter.get("/file", handleGetRemoteFile);

assetRouter.get("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
    });
    if (!asset) {
      return res.status(404).json({ message: "asset not found" });
    }
    res.json({
      ...asset,
      url: `/api/assets/${asset.id}/content`,
    });
  } catch (error) {
    next(error);
  }
});

assetRouter.get("/:id/content", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
    });
    if (!asset) {
      return res.status(404).json({ message: "asset not found" });
    }

    const absolutePath = path.resolve(uploadDir, asset.path);
    if (fs.existsSync(absolutePath)) {
      res.setHeader("Content-Type", asset.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename=\"${encodeURIComponent(asset.filename)}\"`,
      );
      return res.sendFile(absolutePath);
    }

    const target = resolveRemoteDeleteTarget(asset.path);
    if (!target) {
      return res.status(404).json({ message: "asset file not found" });
    }
    const remote = await getFromRemoteStorage(target.fileName, target.key);
    res.setHeader(
      "Content-Type",
      remote.contentType || asset.mimeType || "application/octet-stream",
    );
    if (remote.contentDisposition) {
      res.setHeader("Content-Disposition", remote.contentDisposition);
    } else {
      res.setHeader(
        "Content-Disposition",
        `inline; filename=\"${encodeURIComponent(asset.filename)}\"`,
      );
    }
    return res.status(200).send(Buffer.from(remote.bytes));
  } catch (error) {
    next(error);
  }
});

assetRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
    });
    if (!asset) {
      return res.status(404).json({ message: "asset not found" });
    }

    const keyOverride =
      typeof req.query.key === "string" ? req.query.key : undefined;
    const shouldDeleteRemote = Boolean(remoteServiceUrl);
    let remoteResult: unknown = null;

    if (shouldDeleteRemote) {
      const target = resolveRemoteDeleteTarget(asset.path, keyOverride);
      if (!target) {
        return res.status(400).json({
          message: "unable to resolve remote fileName/key from asset path",
        });
      }
      remoteResult = await deleteFromRemoteStorage(target.fileName, target.key);
    } else {
      const absolutePath = path.resolve(uploadDir, asset.path);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await prisma.asset.delete({ where: { id: asset.id } });
    return res.status(200).json({
      id: asset.id,
      deleted: true,
      remote: remoteResult,
    });
  } catch (error) {
    next(error);
  }
});
