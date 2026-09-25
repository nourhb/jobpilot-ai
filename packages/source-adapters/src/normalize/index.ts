import type { JobSourceTypeName, NormalizedJob, RawJob } from "../base/types";
import { normalizeMockJob } from "./mock";
import { normalizeGreenhouseJob } from "./greenhouse";
import { normalizeLeverJob } from "./lever";
import { normalizeAshbyJob } from "./ashby";
import { normalizeCompanyJob } from "./company";

/**
 * Spec section 19 (Job Normalization): every source returns a different
 * raw format; this is the single dispatch point that converts a source's
 * RawJob into the common NormalizedJob shape the rest of the pipeline
 * (dedup, storage, matching) depends on.
 *
 * COMPANY maps public JSON job feeds (RemoteOK, Remotive, Arbeitnow,
 * Jobicy, The Muse, Himalayas). WORKABLE remains unimplemented.
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
    case "COMPANY":
      return normalizeCompanyJob(rawJob);
    case "WORKABLE":
      throw new Error(`Normalizer for source type "${sourceType}" is not implemented (out of project scope).`);
    default: {
      const exhaustiveCheck: never = sourceType;
      throw new Error(`Unknown source type: ${String(exhaustiveCheck)}`);
    }
  }
}

export { normalizeMockJob, normalizeGreenhouseJob, normalizeLeverJob, normalizeAshbyJob, normalizeCompanyJob };
