export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthStatus {
  status: "OK" | "DEGRADED" | "DOWN";
  service: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
