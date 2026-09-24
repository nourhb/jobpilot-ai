import type { JobSource } from "@prisma/client";
import { sourceAdapterRegistry } from "@jobpilot/source-adapters";
import type { JobSourceAdapter, JobSourceTypeName } from "@jobpilot/source-adapters";
import { env } from "../config/env";

/**
 * Coarse, environment-level kill switches for real, network-calling
 * sources -- independent of (and in addition to) each `JobSource`'s own
 * `enabled` DB flag. Both must be true for a real source to ever be
 * discovered from. Defaults to false for all three (see .env.example),
 * so a fresh local checkout never makes an outbound call to a real
 * employer's board, per the `local_only` project decision.
 */
const REAL_SOURCE_ENABLED_FLAGS: Partial<Record<JobSourceTypeName, boolean>> = {
  GREENHOUSE: env.GREENHOUSE_ENABLED,
  LEVER: env.LEVER_ENABLED,
  ASHBY: env.ASHBY_ENABLED,
};

/**
 * API-side wiring around `packages/source-adapters`. MOCK (Phase 3) and
 * GREENHOUSE/LEVER/ASHBY (Phase 7) are wired up -- each real adapter's
 * own config (board token, company slug, job board name) comes from
 * `JobSource.config`, never from a hard-coded value. Workable/Company
 * remain unregistered (out of this project's scope).
 */
export function getAdapterForSource(source: JobSource): JobSourceAdapter {
  const type = source.type as JobSourceTypeName;
  const requiredFlag = REAL_SOURCE_ENABLED_FLAGS[type];
  if (requiredFlag === false) {
    throw new Error(`Source type "${type}" is disabled by its environment flag (see .env.example). Not calling out to a real employer.`);
  }

  const config = (source.config ?? {}) as Record<string, unknown>;
  return sourceAdapterRegistry.create(type, config);
}
