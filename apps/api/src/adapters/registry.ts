import type { JobSource } from "@prisma/client";
import { sourceAdapterRegistry } from "@jobpilot/source-adapters";
import type { JobSourceAdapter, JobSourceTypeName } from "@jobpilot/source-adapters";

/**
 * API-side wiring around `packages/source-adapters`. Only MOCK is wired
 * up so far (Phase 3, to prove the discovery/normalization/dedup
 * pipeline end-to-end). Greenhouse/Lever/Ashby/Workable/Company
 * adapters are registered here too, one at a time, as they're built in
 * Phase 7 -- each adapter's own config (board token, site id, ...) comes
 * from `JobSource.config`, never from a hard-coded value.
 */
export function getAdapterForSource(source: JobSource): JobSourceAdapter {
  const config = (source.config ?? {}) as Record<string, unknown>;
  return sourceAdapterRegistry.create(source.type as JobSourceTypeName, config);
}
