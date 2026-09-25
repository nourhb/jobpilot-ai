import { agentService } from "../agent/agent.service";
import { auditService } from "../audit/audit.service";
import { getStorageAdapter } from "../documents/storage";
import { logger } from "../lib/logger";
import { profileRepository } from "../repositories/profile.repository";
import { userRepository } from "../repositories/user.repository";

/**
 * Spec section 85. Deletes the signed-in user, cascaded rows, and
 * on-disk resume files. The agent is stopped first so a tick cannot
 * enqueue work for an account that is disappearing mid-request.
 */
export const accountService = {
  async deleteAccount(userId: string): Promise<{ deleted: true }> {
    await agentService.setStatus(userId, "STOPPED");

    const profile = await profileRepository.findByUserId(userId);
    const storage = getStorageAdapter();
    if (profile) {
      for (const resume of profile.resumes) {
        try {
          await storage.delete(resume.storageKey);
        } catch (error) {
          logger.error({ err: error }, "Failed to delete resume file during account deletion");
        }
      }
    }

    await auditService.log("ACCOUNT_DELETED", { userId, entityType: "User", entityId: userId });
    await userRepository.delete(userId);
    return { deleted: true };
  },
};
