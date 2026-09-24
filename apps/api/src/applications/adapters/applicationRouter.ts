import type { JobSourceType } from "@prisma/client";
import type { ApplicationAdapter } from "./applicationAdapter.types";
import { mockAtsAdapter } from "./mockAts.adapter";

/**
 * Section 38 (`ApplicationRouter`). Only MOCK-sourced jobs have a
 * working adapter today -- GREENHOUSE/LEVER/ASHBY/WORKABLE/COMPANY all
 * return `null` (no adapter) until Phase 7 builds real ones, which
 * application.service.ts treats as an automatic MANUAL_REVIEW, exactly
 * per the master prompt: "If an application cannot safely or
 * legitimately be automated, create a MANUAL_REVIEW task."
 */
export function resolveApplicationAdapter(sourceType: JobSourceType): ApplicationAdapter | null {
  switch (sourceType) {
    case "MOCK":
      return mockAtsAdapter;
    case "GREENHOUSE":
    case "LEVER":
    case "ASHBY":
    case "WORKABLE":
    case "COMPANY":
      return null;
    default: {
      const _exhaustive: never = sourceType;
      return _exhaustive;
    }
  }
}
