import { prisma } from "../lib/prisma";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { logger } from "../lib/logger";

/**
 * Unattended runs (GitHub Actions) must not depend on someone opening
 * the Agent page. Every account is switched on for auto-apply.
 */
async function main(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const user of users) {
    await jobPreferenceRepository.getOrCreateForUser(user.id);
  }

  const updated = await prisma.jobPreference.updateMany({
    data: {
      autoApplyEnabled: true,
      autoCoverLetterEnabled: true,
      autoQuestionAnswerEnabled: true,
      agentStatus: "RUNNING",
    },
  });

  logger.info({ users: users.length, preferencesUpdated: updated.count }, "Agent marked runnable for unattended ticks");
}

main()
  .catch((error) => {
    logger.error({ err: error }, "ensureAgentRunnable failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
