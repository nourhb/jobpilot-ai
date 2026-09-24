import type { JobSourceTypeName, NormalizedJob, RawJob } from "../base/types";
import { normalizeMockJob } from "./mock";

/**
 * Spec section 19 (Job Normalization): every source returns a different
 * raw format; this is the single dispatch point that converts a source's
 * RawJob into the common NormalizedJob shape the rest of the pipeline
 * (dedup, storage, matching) depends on.
 *
 * Only MOCK is implemented so far -- Greenhouse/Lever/Ashby/Workable/
 * Company normalizers are added in Phase 7 alongside their real
 * adapters, one `case` at a time, without touching this function's
 * existing behavior for other sources (Cursor rule: never replace
 * working code unnecessarily).
 */
export function normalizeRawJob(sourceType: JobSourceTypeName, rawJob: RawJob): NormalizedJob {
  switch (sourceType) {
    case "MOCK":
      return normalizeMockJob(rawJob);
    case "GREENHOUSE":
    case "LEVER":
    case "ASHBY":
    case "WORKABLE":
    case "COMPANY":
      throw new Error(`Normalizer for source type "${sourceType}" is not implemented yet (Phase 7).`);
    default: {
      const exhaustiveCheck: never = sourceType;
      throw new Error(`Unknown source type: ${String(exhaustiveCheck)}`);
    }
  }
}

export { normalizeMockJob };
