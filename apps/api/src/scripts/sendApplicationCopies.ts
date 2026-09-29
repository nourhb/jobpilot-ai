import { sendApplicationCopy } from "../notifications/applicationCopy.mail";
import { applicationRepository } from "../repositories/application.repository";
import { logger } from "../lib/logger";

const statuses = ["SUBMITTED", "MANUAL_REVIEW", "FAILED"] as const;

async function main() {
  const applications = await applicationRepository.listRecentByStatuses([...statuses], 50);
  logger.info({ count: applications.length }, "Sending application copies for recent applies");
  for (const application of applications) {
    await sendApplicationCopy(application.id, `Copy of a ${application.status} application.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ err: error }, "Failed to send application copies");
    process.exit(1);
  });
