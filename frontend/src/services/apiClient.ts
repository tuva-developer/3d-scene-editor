const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";
const AUTH_STORAGE_KEY = "scene-editor-auth";

type StoredAuth = {
  externalId: string;
  username: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredAuth> | null;
    if (!parsed?.externalId || !parsed?.username) {
      return null;
    }
    return { externalId: parsed.externalId, username: parsed.username };
  } catch {
    return null;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  if (contentType.startsWith("text/")) {
    return response.text();
  }
  return response.arrayBuffer();
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  withUserHeaders?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { withUserHeaders = true, headers, body, ...rest } = options;
  const finalHeaders = new Headers(headers ?? {});

  if (withUserHeaders) {
    const auth = readStoredAuth();
    if (auth) {
      finalHeaders.set("x-user-id", auth.externalId);
      finalHeaders.set("x-user-name", auth.username);
    }
  }

  let finalBody: BodyInit | null | undefined = body as BodyInit | null | undefined;
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  if (!response.ok) {
    const data = await parseResponseBody(response).catch(() => null);
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? ((data as { message: string }).message || `Request failed with status ${response.status}`)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await parseResponseBody(response)) as T;
}

export function buildAssetContentUrl(assetId: string): string {
  return buildUrl(`/assets/${assetId}/content`);
}
