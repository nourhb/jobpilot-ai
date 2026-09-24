import type { JobSourceTypeName, NormalizedJob, RawJob } from "../base/types";
import { normalizeMockJob } from "./mock";
import { normalizeGreenhouseJob } from "./greenhouse";
import { normalizeLeverJob } from "./lever";
import { normalizeAshbyJob } from "./ashby";

/**
 * Spec section 19 (Job Normalization): every source returns a different
 * raw format; this is the single dispatch point that converts a source's
 * RawJob into the common NormalizedJob shape the rest of the pipeline
 * (dedup, storage, matching) depends on.
 *
 * MOCK (Phase 3) and GREENHOUSE/LEVER/ASHBY (Phase 7) are implemented.
 * WORKABLE/COMPANY are intentionally still not implemented -- they were
 * never in this project's phased scope (the master prompt's real-adapter
 * phase names only Lever/Ashby/Greenhouse) -- added one `case` at a time
 * without touching this function's existing behavior for other sources
 * (Cursor rule: never replace working code unnecessarily).
 */
export function normalizeRawJob(sourceType: JobSourceTypeName, rawJob: RawJob): NormalizedJob {
  switch (sourceType) {
    case "MOCK":
      return normalizeMockJob(rawJob);
    case "GREENHOUSE":
      return normalizeGreenhouseJob(rawJob);
    case "LEVER":
      return normalizeLeverJob(rawJob);
    case "ASHBY":
      return normalizeAshbyJob(rawJob);
    case "WORKABLE":
    case "COMPANY":
      throw new Error(`Normalizer for source type "${sourceType}" is not implemented (out of project scope).`);
    default: {
      const exhaustiveCheck: never = sourceType;
      throw new Error(`Unknown source type: ${String(exhaustiveCheck)}`);
    }
  }
}

export { normalizeMockJob, normalizeGreenhouseJob, normalizeLeverJob, normalizeAshbyJob };
