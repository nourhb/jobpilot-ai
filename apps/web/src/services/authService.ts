import type { AuthSession, LoginInput, PublicUser, RegisterInput } from "@jobpilot/shared";
import { apiRequest } from "./apiClient";

export const authService = {
  register(input: RegisterInput): Promise<AuthSession> {
    return apiRequest<AuthSession>("/api/auth/register", { method: "POST", body: input });
  },

  login(input: LoginInput): Promise<AuthSession> {
    return apiRequest<AuthSession>("/api/auth/login", { method: "POST", body: input });
  },

  logout(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/auth/logout", { method: "POST" });
  },

  me(): Promise<{ user: PublicUser }> {
    return apiRequest<{ user: PublicUser }>("/api/auth/me");
  },
};
