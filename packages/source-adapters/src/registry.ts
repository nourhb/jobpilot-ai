import type { JobSourceAdapter, JobSourceTypeName } from "./base/types";
import { mockJobSourceAdapter } from "./adapters/mock.adapter";
import { createGreenhouseAdapter } from "./adapters/greenhouse/greenhouse.adapter";
import { createLeverAdapter } from "./adapters/lever/lever.adapter";
import { createAshbyAdapter } from "./adapters/ashby/ashby.adapter";
import { createPublicFeedsAdapter, type PublicFeedName } from "./adapters/publicFeeds/publicFeeds.adapter";

/**
 * Spec section 15 (Adapter Registry): "If one source changes its API,
 * you modify one adapter rather than the entire system." A factory
 * (rather than a bare instance) because real adapters (Phase 7) need
 * per-JobSource config -- e.g. a Greenhouse board token or a Lever site
 * id -- read from `JobSource.config` in the database, not hard-coded.
 *
 * Registering a factory here only makes `sourceAdapterRegistry.create()`
 * *able* to build that adapter -- it does not by itself cause any
 * network traffic. Actually running discovery/application against a
 * real source additionally requires that source's `JobSource.enabled`
 * flag AND (for Greenhouse/Lever/Ashby) the matching `*_ENABLED`
 * environment flag, both of which default to false (see
 * apps/api/src/adapters/registry.ts) -- consistent with the
 * `local_only` project decision.
 */
export type AdapterFactory = (config: Record<string, unknown>) => JobSourceAdapter;

export class SourceAdapterRegistry {
  private readonly factories: Partial<Record<JobSourceTypeName, AdapterFactory>> = {
    MOCK: () => mockJobSourceAdapter,
    GREENHOUSE: (config) => createGreenhouseAdapter({ boardToken: String(config.boardToken ?? ""), companyName: config.companyName as string | undefined }),
    LEVER: (config) => createLeverAdapter({ company: String(config.company ?? ""), companyName: config.companyName as string | undefined }),
    ASHBY: (config) => createAshbyAdapter({ jobBoardName: String(config.jobBoardName ?? "") }),
    COMPANY: (config) => createPublicFeedsAdapter({ feed: String(config.feed ?? "remoteok") as PublicFeedName }),
  };

  register(type: JobSourceTypeName, factory: AdapterFactory): void {
    this.factories[type] = factory;
  }

  create(type: JobSourceTypeName, config: Record<string, unknown> = {}): JobSourceAdapter {
    const factory = this.factories[type];
    if (!factory) {
      throw new Error(`No JobSourceAdapter registered for source type "${type}" (out of project scope).`);
    }
    return factory(config);
  }

  isSupported(type: JobSourceTypeName): boolean {
    return Boolean(this.factories[type]);
  }
}

export const sourceAdapterRegistry = new SourceAdapterRegistry();
