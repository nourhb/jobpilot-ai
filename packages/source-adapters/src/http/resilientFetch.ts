export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelaysMs?: number[];
}

const DEFAULT_DELAYS = [2_000, 5_000];
const FAILURES_TO_OPEN = 5;
const OPEN_MS = 60_000;

export class CircuitOpenError extends Error {
  constructor(host: string) {
    super(`Circuit open for ${host}; refusing further requests until the cooldown ends.`);
    this.name = "CircuitOpenError";
  }
}

const circuits = new Map<string, { failures: number; openUntil: number }>();

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function assertCircuit(host: string): void {
  const state = circuits.get(host);
  if (state && state.openUntil > Date.now()) {
    throw new CircuitOpenError(host);
  }
}

function recordFailure(host: string): void {
  const state = circuits.get(host) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURES_TO_OPEN) {
    state.openUntil = Date.now() + OPEN_MS;
    state.failures = 0;
  }
  circuits.set(host, state);
}

function recordSuccess(host: string): void {
  circuits.delete(host);
}

export function resetCircuits(): void {
  circuits.clear();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Spec section 66: timeout + retry with backoff on network/5xx only.
 * 4xx (including CAPTCHA/anti-bot 403/429) is returned immediately and
 * never retried. A simple per-host circuit breaker opens after five
 * consecutive exhausted attempts.
 */
const DEFAULT_RETRIES = process.env.VITEST || process.env.NODE_ENV === "test" ? 0 : 2;

export async function resilientFetch(url: string, options: ResilientFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 15_000, retries = DEFAULT_RETRIES, retryDelaysMs = DEFAULT_DELAYS, ...init } = options;
  const host = hostOf(url);
  assertCircuit(host);

  let lastError: unknown;
  const attempts = retries + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (response.status >= 500 && attempt < attempts - 1) {
        lastError = new Error(`HTTP ${response.status}`);
        await delay(retryDelaysMs[attempt] ?? 5_000);
        continue;
      }

      if (response.status < 500) {
        recordSuccess(host);
      } else {
        recordFailure(host);
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < attempts - 1) {
        await delay(retryDelaysMs[attempt] ?? 5_000);
        continue;
      }
      recordFailure(host);
      throw error;
    }
  }

  recordFailure(host);
  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}
