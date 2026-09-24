import type { JobSourceAdapter, JobSourceTypeName } from "./base/types";
import { mockJobSourceAdapter } from "./adapters/mock.adapter";

/**
 * Spec section 15 (Adapter Registry): "If one source changes its API,
 * you modify one adapter rather than the entire system." A factory
 * (rather than a bare instance) because real adapters (Phase 7) need
 * per-JobSource config -- e.g. a Greenhouse board token or a Lever site
 * id -- read from `JobSource.config` in the database, not hard-coded.
 */
export type AdapterFactory = (config: Record<string, unknown>) => JobSourceAdapter;

export class SourceAdapterRegistry {
  private readonly factories: Partial<Record<JobSourceTypeName, AdapterFactory>> = {
    MOCK: () => mockJobSourceAdapter,
  };

  register(type: JobSourceTypeName, factory: AdapterFactory): void {
    this.factories[type] = factory;
  }

  create(type: JobSourceTypeName, config: Record<string, unknown> = {}): JobSourceAdapter {
    const factory = this.factories[type];
    if (!factory) {
      throw new Error(`No JobSourceAdapter registered for source type "${type}" (implemented in Phase 7).`);
    }
    return factory(config);
  }

  isSupported(type: JobSourceTypeName): boolean {
    return Boolean(this.factories[type]);
  }
}

export const sourceAdapterRegistry = new SourceAdapterRegistry();
