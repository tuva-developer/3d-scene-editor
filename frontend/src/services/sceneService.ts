import { apiRequest } from "@/services/apiClient";

export type SceneDto = {
  id: string;
  ownerId: string;
  name: string;
  configJson: unknown;
  thumbnailId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SceneUpsertPayload = {
  name: string;
  configJson: unknown;
  thumbnailId?: string | null;
};

export type SceneUpdatePayload = Partial<SceneUpsertPayload>;

export const sceneService = {
  list() {
    return apiRequest<SceneDto[]>("/scenes");
  },

  getById(sceneId: string) {
    return apiRequest<SceneDto>(`/scenes/${sceneId}`);
  },

  create(payload: SceneUpsertPayload) {
    return apiRequest<SceneDto>("/scenes", {
      method: "POST",
      body: payload,
    });
  },

  update(sceneId: string, payload: SceneUpdatePayload) {
    return apiRequest<SceneDto>(`/scenes/${sceneId}`, {
      method: "PUT",
      body: payload,
    });
  },

  delete(sceneId: string) {
    return apiRequest<void>(`/scenes/${sceneId}`, {
      method: "DELETE",
    });
  },
};
