import type { ApiResponse } from "@jobpilot/shared";
import { env } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Thin fetch wrapper. Always sends cookies (the API sets an httpOnly
 * session cookie on login/register) and always parses the
 * `ApiResponse<T>` envelope the backend returns.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : undefined;
    throw new ApiError(
      error?.message ?? "Something went wrong. Please try again.",
      error?.code ?? "UNKNOWN_ERROR",
      response.status,
      error?.details,
    );
  }

  return payload.data;
}
