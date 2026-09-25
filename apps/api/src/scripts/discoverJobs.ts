/**
 * Manual job discovery trigger (Phase 3).
 *
 * Phase 8 wraps `jobDiscoveryService.runForAllEnabledSources()` in a
 * scheduled BullMQ worker. Until then, there is no automatic or HTTP
 * path that invokes discovery -- this script exists purely so the
 * pipeline can be exercised locally (dev machine or a one-off
 * `docker compose exec` / `run` invocation) without waiting for
 * Phase 8's scheduler to exist.
 *
 * Usage:
 *   pnpm --filter api exec tsx src/scripts/discoverJobs.ts
 */
import { jobDiscoveryService } from "../jobs/jobDiscovery.service";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

async function main() {
  const filters = process.argv.slice(2);
  const results = filters.length
    ? await jobDiscoveryService.runForMatchingSources(filters)
    : await jobDiscoveryService.runForAllEnabledSources();

  for (const result of results) {
    logger.info(result, `Discovery finished for source "${result.sourceName}"`);
  }

  if (results.length === 0) {
    logger.warn("No enabled job sources found -- nothing to discover.");
  }
}

main()
  .catch((error) => {
    logger.error({ err: error }, "Job discovery script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
