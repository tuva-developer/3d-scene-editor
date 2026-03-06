import { apiRequest } from "@/services/apiClient";

export type AssetDto = {
  id: string;
  ownerId: string;
  kind: "MODEL" | "IMAGE" | "OTHER";
  name: string | null;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
};

export type UploadAssetResponse = {
  id: string;
  url: string;
  name: string | null;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  ownerId: string;
  remote: unknown;
};

export type DeleteAssetResponse = {
  id: string;
  deleted: boolean;
  remote: unknown;
};

export const assetService = {
  upload(file: File, key?: string, name?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (key?.trim()) {
      formData.append("key", key.trim());
    }
    if (name?.trim()) {
      formData.append("name", name.trim());
    }
    return apiRequest<UploadAssetResponse>("/assets/upload", {
      method: "POST",
      body: formData,
    });
  },

  list(kind?: AssetDto["kind"]) {
    const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return apiRequest<AssetDto[]>(`/assets${query}`);
  },

  getById(assetId: string) {
    return apiRequest<AssetDto>(`/assets/${assetId}`);
  },

  getFileByName(fileName: string, key: string) {
    const query = new URLSearchParams({
      fileName,
      key,
    });
    return apiRequest<ArrayBuffer>(`/assets/file?${query.toString()}`);
  },

  delete(assetId: string, key?: string) {
    const query = key?.trim() ? `?key=${encodeURIComponent(key.trim())}` : "";
    return apiRequest<DeleteAssetResponse>(`/assets/${assetId}${query}`, {
      method: "DELETE",
    });
  },
};
