export async function requestAsync(url: string): Promise<unknown> {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  if (contentType?.includes("text")) {
    return response.text();
  }
  return response.arrayBuffer();
}

export function buildURL(z: number, x: number, y: number, url: string): string {
  return url.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export async function requestVectorTile(
  z: number,
  x: number,
  y: number,
  url: string
): Promise<ArrayBuffer> {
  const replaceUrl = buildURL(z, x, y, url);
  return requestAsync(replaceUrl) as Promise<ArrayBuffer>;
}
