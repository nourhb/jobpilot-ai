import { apiRequest } from "./apiClient";

export const accountService = {
  deleteAccount(): Promise<{ deleted: true }> {
    return apiRequest<{ deleted: true }>("/api/account", { method: "DELETE" });
  },
};
