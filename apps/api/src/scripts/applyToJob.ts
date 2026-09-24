/**
 * Manual application trigger (Phase 6).
 *
 * The spec's own API route list (section 54) has no "create an
 * application" endpoint -- Applications are meant to be created by the
 * autonomous agent (Phase 8's scheduler), not a direct user action. This
 * script exists purely so the full Application Engine (Phase 4 match ->
 * Phase 5 cover letter/questions/fact-check -> Phase 6 validator/policy/
 * Mock ATS submission) can be exercised locally without waiting for
 * Phase 8 to exist -- the same stopgap role discoverJobs.ts plays for
 * job discovery.
 *
 * Usage:
 *   pnpm --filter api exec tsx src/scripts/applyToJob.ts <userEmail> <jobId>
 */
import { userRepository } from "../repositories/user.repository";
import { applicationService } from "../applications/application.service";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

async function main() {
  const [email, jobId] = process.argv.slice(2);
  if (!email || !jobId) {
    throw new Error("Usage: tsx src/scripts/applyToJob.ts <userEmail> <jobId>");
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error(`No user found with email "${email}".`);

  const application = await applicationService.createAndProcess(user.id, jobId);
  logger.info(
    { applicationId: application?.id, status: application?.status, manualReviewReason: application?.manualReviewReason },
    "Application processed.",
  );
}

main()
  .catch((error) => {
    logger.error({ err: error }, "Apply-to-job script failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
