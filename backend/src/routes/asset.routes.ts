import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import axios from "axios";
import FormData from "form-data";
import { prisma } from "../lib/prisma.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
const thumbnailDir = path.resolve(uploadDir, ".thumbnails");
fs.mkdirSync(path.resolve(thumbnailDir), { recursive: true });
const remoteServiceBaseUrl =
  process.env.FILE_SERVICE_URL?.trim() ||
  process.env.FILE_SERVICE_UPLOAD_URL?.trim() ||
  process.env.FILE_SERVICE_DELETE_URL?.trim() ||
  process.env.FILE_SERVICE_GET_URL?.trim() ||
  "";
const remoteServiceUrl = ensureRemoteEndpoint(remoteServiceBaseUrl, "/3dservice/v1/file");
const remoteListServiceUrl =
  ensureRemoteEndpoint(
    process.env.FILE_SERVICE_LIST_URL?.trim() || deriveListServiceUrl(remoteServiceUrl),
    "/3dservice/v1/fileName",
  );
const remoteTimeoutMs = Number(process.env.FILE_SERVICE_TIMEOUT_MS ?? 30000);
const modelStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_MODEL_KEY?.trim() || "/models",
);
const imageStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_IMAGE_KEY?.trim() || "/images",
);
const publicModelStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_PUBLIC_MODEL_KEY?.trim() || "/public/models",
);
const publicImageStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_PUBLIC_IMAGE_KEY?.trim() || "/public/images",
);
const publicThumbnailStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_PUBLIC_THUMBNAIL_KEY?.trim() || "/public/thumbnails",
);
const thumbnailStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_THUMBNAIL_KEY?.trim() || "/thumbnails",
);
const defaultStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_DEFAULT_KEY?.trim() || modelStorageKey,
);

function normalizeStorageKey(key: string): string {
  return key.startsWith("/") ? key : `/${key}`;
}

function deriveListServiceUrl(baseUrl: string): string {
  if (!baseUrl) {
    return "";
  }
  try {
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/\/file$/i, "/fileName");
    return url.toString();
  } catch {
    return baseUrl.replace(/\/file$/i, "/fileName");
  }
}

function ensureRemoteEndpoint(urlValue: string, fallbackPath: string): string {
  if (!urlValue) {
    return "";
  }
  try {
    const url = new URL(urlValue);
    const normalizedPath = url.pathname.trim();
    if (!normalizedPath || normalizedPath === "/") {
      url.pathname = fallbackPath;
      return url.toString();
    }
    return url.toString();
  } catch {
    return urlValue;
  }
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

function guessMimeType(fileName: string, kind: "MODEL" | "IMAGE" | "OTHER"): string {
  const ext = path.extname(fileName).toLowerCase();
  if (kind === "MODEL") {
    if (ext === ".glb") return "model/gltf-binary";
    if (ext === ".gltf") return "model/gltf+json";
    if (ext === ".obj") return "text/plain";
    if (ext === ".fbx") return "application/octet-stream";
    if (ext === ".stl") return "model/stl";
    return "application/octet-stream";
  }
  if (kind === "IMAGE") {
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    if (ext === ".svg") return "image/svg+xml";
    return "application/octet-stream";
  }
  return "application/octet-stream";
}

function isModelFileName(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return new Set([
    ".glb",
    ".gltf",
    ".obj",
    ".fbx",
    ".stl",
    ".dae",
    ".3ds",
    ".usdz",
    ".ifc",
  ]).has(ext);
}

function isImageFileName(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".tif",
    ".tiff",
    ".svg",
  ]).has(ext);
}

function collectFileNames(source: unknown): string[] {
  const names = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value) {
      return;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.includes(".")) {
        names.add(path.posix.basename(trimmed));
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const directCandidates = [
        "fileName",
        "filename",
        "name",
        "objectName",
        "key",
      ];
      directCandidates.forEach((key) => {
        const next = obj[key];
        if (typeof next === "string") {
          const trimmed = next.trim();
          if (trimmed.includes(".")) {
            names.add(path.posix.basename(trimmed));
          }
        }
      });
      Object.values(obj).forEach(visit);
    }
  };
  visit(source);
  return Array.from(names);
}

function buildPublicAssetPath(key: string, fileName: string): string {
  return `${key.replace(/\/+$/, "")}/${path.posix.basename(fileName)}`;
}

function toThumbnailFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return `${base}.webp`;
}

function toPublicAssetDto(asset: {
  id: string;
  kind: "MODEL" | "IMAGE" | "OTHER";
  name: string | null;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const key = asset.kind === "IMAGE" ? publicImageStorageKey : publicModelStorageKey;
  const thumbnailFileName = toThumbnailFileName(asset.filename);
  return {
    id: asset.id,
    ownerId: "public",
    kind: asset.kind,
    name: asset.name,
    filename: asset.filename,
    mimeType: asset.mimeType,
    size: asset.size,
    path: asset.path,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    isPublic: true,
    url: `/api/assets/public/content?fileName=${encodeURIComponent(asset.filename)}&key=${encodeURIComponent(key)}`,
    thumbnailUrl:
      asset.kind === "MODEL"
        ? `/api/assets/public/content?fileName=${encodeURIComponent(thumbnailFileName)}&key=${encodeURIComponent(publicThumbnailStorageKey)}`
        : null,
  };
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const assetRouter = Router();

function resolveThumbnailPath(assetId: string): string {
  return path.resolve(thumbnailDir, `${assetId}.webp`);
}

function resolveLocalStoragePath(storagePath: string): string | null {
  if (!storagePath.startsWith("local:")) {
    return null;
  }
  const relativePath = storagePath.slice("local:".length).replace(/^\/+/, "");
  return path.resolve(uploadDir, relativePath);
}

type AssetThumbnailRow = {
  id: string;
  assetId: string;
  storagePath: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
};

async function getAssetThumbnailByAssetId(assetId: string): Promise<AssetThumbnailRow | null> {
  const rows = await prisma.$queryRaw<AssetThumbnailRow[]>`
    SELECT "id", "assetId", "storagePath", "mimeType", "size", "createdAt", "updatedAt"
    FROM "AssetThumbnail"
    WHERE "assetId" = ${assetId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getAssetThumbnailByAssetIdAndOwner(assetId: string, ownerId: string): Promise<AssetThumbnailRow | null> {
  const rows = await prisma.$queryRaw<AssetThumbnailRow[]>`
    SELECT t."id", t."assetId", t."storagePath", t."mimeType", t."size", t."createdAt", t."updatedAt"
    FROM "AssetThumbnail" t
    INNER JOIN "Asset" a ON a."id" = t."assetId"
    WHERE t."assetId" = ${assetId} AND a."ownerId" = ${ownerId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function upsertAssetThumbnail(assetId: string, storagePath: string, mimeType: string, size: number): Promise<void> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "AssetThumbnail" ("id", "assetId", "storagePath", "mimeType", "size", "createdAt", "updatedAt")
    VALUES (${id}, ${assetId}, ${storagePath}, ${mimeType}, ${size}, NOW(), NOW())
    ON CONFLICT ("assetId")
    DO UPDATE SET
      "storagePath" = EXCLUDED."storagePath",
      "mimeType" = EXCLUDED."mimeType",
      "size" = EXCLUDED."size",
      "updatedAt" = NOW()
  `;
}

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

async function listFilesFromRemoteStorage(key: string): Promise<string[]> {
  if (!remoteListServiceUrl && !remoteServiceUrl) {
    throw new Error("FILE_SERVICE_LIST_URL is not configured");
  }
  const candidates = Array.from(
    new Set([
      remoteListServiceUrl,
      deriveListServiceUrl(remoteServiceUrl),
      remoteServiceUrl,
    ].filter((item): item is string => !!item)),
  );
  const keyVariants = [key];
  let lastError: Error | null = null;
  for (const url of candidates) {
    for (const keyCandidate of keyVariants) {
      try {
        const response = await axios.get(url, {
          params: { key: keyCandidate },
          timeout: remoteTimeoutMs,
          validateStatus: () => true,
        });
        if (response.status < 200 || response.status >= 300) {
          const text =
            typeof response.data === "string"
              ? response.data
              : JSON.stringify(response.data);
          lastError = new Error(
            `Remote storage list failed (${response.status}) at ${url}: ${text ?? ""}`,
          );
          continue;
        }
        const names = collectFileNames(response.data);
        if (names.length > 0) {
          return names.sort((a, b) => a.localeCompare(b));
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
          lastError = new Error(`Remote storage list timeout after ${remoteTimeoutMs}ms`);
        } else {
          lastError = error instanceof Error ? error : new Error("Remote storage list failed");
        }
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
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
      thumbnailUrl: null,
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
    const privateAssets = await prisma.asset.findMany({
      where: {
        ownerId: req.currentUser.id,
        ...(kindFilter ? { kind: kindFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const publicAssets = await prisma.publicAsset.findMany({
      where: {
        isActive: true,
        ...(kindFilter ? { kind: kindFilter } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { filename: "asc" }],
    });
    const privateAssetThumbPairs = await Promise.all(
      privateAssets.map(async (asset) => [asset.id, await getAssetThumbnailByAssetId(asset.id)] as const),
    );
    const privateAssetThumbMap = new Map(privateAssetThumbPairs);

    res.json({
      privateAssets: privateAssets.map((asset) => ({
        ...asset,
        isPublic: false,
        url: `/api/assets/${asset.id}/content`,
        thumbnailUrl: privateAssetThumbMap.get(asset.id) ? `/api/assets/${asset.id}/thumbnail` : null,
      })),
      publicAssets: publicAssets.map((asset) => toPublicAssetDto(asset)),
    });
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

assetRouter.get("/public", async (req, res, next) => {
  try {
    const kindQuery =
      typeof req.query.kind === "string" ? req.query.kind.trim().toUpperCase() : "";
    const kind = kindQuery === "IMAGE" ? "IMAGE" : "MODEL";
    const rows = await prisma.publicAsset.findMany({
      where: { kind, isActive: true },
      orderBy: [{ updatedAt: "desc" }, { filename: "asc" }],
    });
    res.json(rows.map((row) => toPublicAssetDto(row)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load public assets";
    return res.status(502).json({ message });
  }
});

assetRouter.post("/public/sync", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const kindQuery =
      typeof req.query.kind === "string" ? req.query.kind.trim().toUpperCase() : "";
    const kindParam =
      typeof req.body?.kind === "string" ? req.body.kind.trim().toUpperCase() : "";
    const requestedKind = kindQuery || kindParam;
    const syncKinds: Array<"MODEL" | "IMAGE"> =
      requestedKind === "MODEL" || requestedKind === "IMAGE"
        ? [requestedKind]
        : ["MODEL", "IMAGE"];

    const result: Array<{
      kind: "MODEL" | "IMAGE";
      scanned: number;
      upserted: number;
      deactivated: number;
    }> = [];

    for (const kind of syncKinds) {
      const key = kind === "MODEL" ? publicModelStorageKey : publicImageStorageKey;
      const filesRaw = await listFilesFromRemoteStorage(key);
      const filtered = filesRaw.filter((fileName) =>
        kind === "MODEL" ? isModelFileName(fileName) : isImageFileName(fileName),
      );
      const uniqueFileNames = Array.from(
        new Set(filtered.map((fileName) => path.posix.basename(fileName))),
      );

      const activePaths: string[] = [];
      let upserted = 0;

      for (const fileName of uniqueFileNames) {
        const storagePath = buildPublicAssetPath(key, fileName);
        activePaths.push(storagePath);
        const name = fileName.replace(/\.[^/.]+$/, "") || fileName;
        await prisma.publicAsset.upsert({
          where: { path: storagePath },
          update: {
            kind,
            name,
            filename: fileName,
            mimeType: guessMimeType(fileName, kind),
            isActive: true,
          },
          create: {
            kind,
            name,
            filename: fileName,
            mimeType: guessMimeType(fileName, kind),
            size: 0,
            path: storagePath,
            isActive: true,
          },
        });
        upserted += 1;
      }

      const deactivateWhere =
        activePaths.length > 0
          ? { kind, path: { notIn: activePaths }, isActive: true }
          : { kind, isActive: true };
      const deactivated = await prisma.publicAsset.updateMany({
        where: deactivateWhere,
        data: { isActive: false },
      });

      result.push({
        kind,
        scanned: uniqueFileNames.length,
        upserted,
        deactivated: deactivated.count,
      });
    }

    return res.json({ synced: result });
  } catch (error) {
    next(error);
  }
});

assetRouter.get("/public/content", async (req, res, next) => {
  try {
    const fileName =
      typeof req.query.fileName === "string" ? req.query.fileName.trim() : "";
    const keyRaw =
      typeof req.query.key === "string" ? req.query.key.trim() : "";
    if (!fileName || !keyRaw) {
      return res.status(400).json({ message: "fileName and key are required" });
    }
    const key = normalizeStorageKey(keyRaw);
    const allowedKeys = new Set([publicModelStorageKey, publicImageStorageKey, publicThumbnailStorageKey]);
    if (!allowedKeys.has(key)) {
      return res.status(403).json({ message: "invalid public key" });
    }
    const expectedPath = buildPublicAssetPath(key, fileName);
    const found = await prisma.publicAsset.findFirst({
      where: { path: expectedPath, isActive: true },
    });
    if (!found) {
      return res.status(404).json({ message: "public asset not found" });
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
});

assetRouter.post("/:id/thumbnail", memoryUpload.single("thumbnail"), async (req, res, next) => {
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
    if (!req.file) {
      return res.status(400).json({ message: "thumbnail is required" });
    }
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "thumbnail must be an image" });
    }
    const existing = await getAssetThumbnailByAssetId(asset.id);
    const thumbnailFile: Express.Multer.File = {
      ...req.file,
      originalname: `${asset.id}.webp`,
      mimetype: req.file.mimetype || "image/webp",
    };
    let storagePath: string;
    if (remoteServiceUrl) {
      const uploaded = await uploadToRemoteStorage(thumbnailFile, req.currentUser.id, [thumbnailStorageKey]);
      storagePath = uploaded.storagePath;
    } else {
      const targetPath = resolveThumbnailPath(asset.id);
      fs.writeFileSync(targetPath, req.file.buffer);
      storagePath = `local:.thumbnails/${asset.id}.webp`;
    }

    if (existing && existing.storagePath !== storagePath) {
      if (existing.storagePath.startsWith("local:")) {
        const oldLocalPath = resolveLocalStoragePath(existing.storagePath);
        if (oldLocalPath && fs.existsSync(oldLocalPath)) {
          fs.unlinkSync(oldLocalPath);
        }
      } else {
        const oldTarget = resolveRemoteDeleteTarget(existing.storagePath);
        if (oldTarget) {
          await deleteFromRemoteStorage(oldTarget.fileName, oldTarget.key).catch(() => null);
        }
      }
    }

    await upsertAssetThumbnail(
      asset.id,
      storagePath,
      req.file.mimetype || "image/webp",
      req.file.size,
    );

    return res.status(201).json({
      id: asset.id,
      thumbnailUrl: `/api/assets/${asset.id}/thumbnail`,
    });
  } catch (error) {
    next(error);
  }
});

assetRouter.get("/:id/thumbnail", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const thumbnail = await getAssetThumbnailByAssetIdAndOwner(req.params.id, req.currentUser.id);
    if (!thumbnail) {
      return res.status(404).json({ message: "asset not found" });
    }
    if (thumbnail.storagePath.startsWith("local:")) {
      const targetPath = resolveLocalStoragePath(thumbnail.storagePath);
      if (!targetPath || !fs.existsSync(targetPath)) {
        return res.status(404).json({ message: "thumbnail not found" });
      }
      res.setHeader("Content-Type", thumbnail.mimeType || "image/webp");
      return res.sendFile(targetPath);
    }

    const target = resolveRemoteDeleteTarget(thumbnail.storagePath);
    if (!target) {
      return res.status(404).json({ message: "thumbnail not found" });
    }
    const remote = await getFromRemoteStorage(target.fileName, target.key);
    res.setHeader("Content-Type", remote.contentType || thumbnail.mimeType || "image/webp");
    return res.status(200).send(Buffer.from(remote.bytes));
  } catch (error) {
    next(error);
  }
});

assetRouter.put("/:id", async (req, res, next) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const current = await prisma.asset.findFirst({
      where: { id: req.params.id, ownerId: req.currentUser.id },
    });
    if (!current) {
      return res.status(404).json({ message: "asset not found" });
    }
    const rawName = typeof req.body?.name === "string" ? req.body.name : "";
    const name = rawName.trim();
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const updated = await prisma.asset.update({
      where: { id: current.id },
      data: { name: name.slice(0, 255) },
    });
    const thumbnail = await getAssetThumbnailByAssetId(updated.id);

    return res.json({
      ...updated,
      url: `/api/assets/${updated.id}/content`,
      thumbnailUrl: thumbnail ? `/api/assets/${updated.id}/thumbnail` : null,
    });
  } catch (error) {
    next(error);
  }
});

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
    const thumbnail = await getAssetThumbnailByAssetId(asset.id);
    res.json({
      ...asset,
      url: `/api/assets/${asset.id}/content`,
      thumbnailUrl: thumbnail ? `/api/assets/${asset.id}/thumbnail` : null,
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

    const thumbnail = await getAssetThumbnailByAssetId(asset.id);
    if (thumbnail?.storagePath) {
      if (thumbnail.storagePath.startsWith("local:")) {
        const thumbnailPath = resolveLocalStoragePath(thumbnail.storagePath);
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      } else {
        const thumbnailTarget = resolveRemoteDeleteTarget(thumbnail.storagePath);
        if (thumbnailTarget) {
          await deleteFromRemoteStorage(thumbnailTarget.fileName, thumbnailTarget.key).catch(() => null);
        }
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
