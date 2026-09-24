import type { JobSourceType } from "@prisma/client";
import { createLeverAdapter, createAshbyAdapter } from "@jobpilot/source-adapters";
import { env } from "../../config/env";
import type { ApplicationAdapter } from "./applicationAdapter.types";
import { mockAtsAdapter } from "./mockAts.adapter";
import { createSourceAdapterBridge } from "./sourceAdapterBridge";

export interface ApplicationRouterSource {
  type: JobSourceType;
  config: unknown;
}

/**
 * Section 38 (`ApplicationRouter`).
 *
 * - MOCK: the Mock ATS adapter (Phase 6).
 * - LEVER/ASHBY: real adapters (Phase 7), bridged into the
 *   `ApplicationAdapter` shape via `createSourceAdapterBridge` -- but
 *   ONLY when the matching `*_ENABLED` environment flag is on, the same
 *   coarse kill switch `apps/api/src/adapters/registry.ts` uses for
 *   discovery. Disabled (the default) means every Lever/Ashby job still
 *   routes to `null`, exactly like before Phase 7.
 * - GREENHOUSE: always `null` -- its adapter never implements
 *   `submitApplication` (the public Job Board API is read-only; see
 *   greenhouse.adapter.ts), so there is nothing to bridge.
 * - WORKABLE/COMPANY: always `null` (out of project scope).
 *
 * `null` is what `application.service.ts` treats as an automatic
 * MANUAL_REVIEW, exactly per the master prompt: "If an application
 * cannot safely or legitimately be automated, create a MANUAL_REVIEW
 * task."
 */
export function resolveApplicationAdapter(source: ApplicationRouterSource): ApplicationAdapter | null {
  const config = (source.config ?? {}) as Record<string, unknown>;

  switch (source.type) {
    case "MOCK":
      return mockAtsAdapter;
    case "LEVER":
      if (!env.LEVER_ENABLED) return null;
      return createSourceAdapterBridge("lever", createLeverAdapter({ company: String(config.company ?? "") }));
    case "ASHBY":
      if (!env.ASHBY_ENABLED) return null;
      return createSourceAdapterBridge("ashby", createAshbyAdapter({ jobBoardName: String(config.jobBoardName ?? "") }));
    case "GREENHOUSE":
    case "WORKABLE":
    case "COMPANY":
      return null;
    default: {
      const _exhaustive: never = source.type;
      return _exhaustive;
    }
  }
}
