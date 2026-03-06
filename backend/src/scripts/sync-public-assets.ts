import "dotenv/config";
import path from "node:path";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AssetKind = "MODEL" | "IMAGE";

const remoteServiceBaseUrl =
  process.env.FILE_SERVICE_URL?.trim() || "";
const remoteListServiceUrlFromEnv =
  ensureRemoteEndpoint(
    process.env.FILE_SERVICE_LIST_URL?.trim() || deriveListServiceUrl(remoteServiceBaseUrl),
    "/3dservice/v1/fileName",
  );
const remoteTimeoutMs = Number(process.env.FILE_SERVICE_TIMEOUT_MS ?? 30000);
const publicModelStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_PUBLIC_MODEL_KEY?.trim() || "/public/models",
);
const publicImageStorageKey = normalizeStorageKey(
  process.env.FILE_SERVICE_PUBLIC_IMAGE_KEY?.trim() || "/public/images",
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
      ["fileName", "filename", "name", "objectName", "key"].forEach((key) => {
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

function guessMimeType(fileName: string, kind: AssetKind): string {
  const ext = path.extname(fileName).toLowerCase();
  if (kind === "MODEL") {
    if (ext === ".glb") return "model/gltf-binary";
    if (ext === ".gltf") return "model/gltf+json";
    if (ext === ".obj") return "text/plain";
    if (ext === ".fbx") return "application/octet-stream";
    if (ext === ".stl") return "model/stl";
    return "application/octet-stream";
  }
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function buildPublicAssetPath(key: string, fileName: string): string {
  return `${key.replace(/\/+$/, "")}/${path.posix.basename(fileName)}`;
}

async function listFilesFromRemoteStorage(key: string): Promise<string[]> {
  if (!remoteListServiceUrlFromEnv && !remoteServiceBaseUrl) {
    throw new Error("FILE_SERVICE_LIST_URL is not configured");
  }
  const candidateUrls = Array.from(
    new Set(
      [
        remoteListServiceUrlFromEnv,
        deriveListServiceUrl(remoteServiceBaseUrl),
        ensureRemoteEndpoint(remoteServiceBaseUrl, "/3dservice/v1/fileName"),
      ].filter((item): item is string => !!item),
    ),
  ).flatMap((rawUrl) => {
    try {
      const base = new URL(rawUrl);
      const variants = ["/3dservice/v1/fileName", "/3dservice/v1/filename", "/3dservice/v1/file"];
      return variants.map((pathname) => {
        const next = new URL(base.toString());
        next.pathname = pathname;
        return next.toString();
      });
    } catch {
      return [rawUrl];
    }
  });

  let lastError: Error | null = null;
  for (const url of candidateUrls) {
    try {
      const response = await axios.get(url, {
        params: { key },
        timeout: remoteTimeoutMs,
        validateStatus: () => true,
      });
      if (response.status < 200 || response.status >= 300) {
        const body =
          typeof response.data === "string" ? response.data : JSON.stringify(response.data);
        lastError = new Error(`List file failed (${response.status}) at ${url}: ${body}`);
        continue;
      }
      const names = collectFileNames(response.data).sort((a, b) => a.localeCompare(b));
      if (names.length > 0) {
        return names;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("List file failed");
    }
  }

  if (lastError) {
    throw lastError;
  }
  return [];
}

async function syncKind(kind: AssetKind): Promise<{
  kind: AssetKind;
  scanned: number;
  upserted: number;
  deactivated: number;
}> {
  const key = kind === "MODEL" ? publicModelStorageKey : publicImageStorageKey;
  const allFiles = await listFilesFromRemoteStorage(key);
  const filtered = allFiles.filter((fileName) =>
    kind === "MODEL" ? isModelFileName(fileName) : isImageFileName(fileName),
  );
  const uniqueFiles = Array.from(new Set(filtered.map((fileName) => path.posix.basename(fileName))));
  const activePaths: string[] = [];
  let upserted = 0;

  for (const fileName of uniqueFiles) {
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

  const deactivated = await prisma.publicAsset.updateMany({
    where:
      activePaths.length > 0
        ? { kind, path: { notIn: activePaths }, isActive: true }
        : { kind, isActive: true },
    data: { isActive: false },
  });

  return {
    kind,
    scanned: uniqueFiles.length,
    upserted,
    deactivated: deactivated.count,
  };
}

async function main() {
  const kindArgRaw = process.argv.find((arg) => arg.startsWith("--kind="));
  const kindArg = kindArgRaw?.split("=")[1]?.trim().toUpperCase();
  const kinds: AssetKind[] =
    kindArg === "MODEL" || kindArg === "IMAGE" ? [kindArg] : ["MODEL", "IMAGE"];

  const result = [];
  for (const kind of kinds) {
    result.push(await syncKind(kind));
  }
  console.log(JSON.stringify({ synced: result }, null, 2));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[public-sync] failed:", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
