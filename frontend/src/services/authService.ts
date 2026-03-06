import { apiRequest } from "@/services/apiClient";

export type LoginResponse = {
  user: {
    id: string;
    externalId: string;
    username: string;
  };
};

export const authService = {
  login(username: string, password: string) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      withUserHeaders: false,
      body: {
        username: username.trim(),
        password,
      },
    });
  },
};
