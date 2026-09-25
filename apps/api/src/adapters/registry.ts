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
 * API-side wiring around `packages/source-adapters`. MOCK, Greenhouse,
 * Lever, Ashby, and COMPANY public feeds are wired up -- each real
 * adapter's own config comes from `JobSource.config`. Workable remains
 * unregistered (out of this project's scope). COMPANY has no env kill
 * switch because it only hits documented public JSON APIs.
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
