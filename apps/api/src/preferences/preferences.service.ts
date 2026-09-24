import type { JobPreferenceUpdateInput } from "@jobpilot/shared";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { auditService } from "../audit/audit.service";

export const preferencesService = {
  getPreferences(userId: string) {
    return jobPreferenceRepository.getOrCreateForUser(userId);
  },

  async updatePreferences(userId: string, input: JobPreferenceUpdateInput) {
    await jobPreferenceRepository.getOrCreateForUser(userId); // ensure the row exists before updating
    const updated = await jobPreferenceRepository.update(userId, input);
    await auditService.log("PREFERENCES_UPDATED", { userId, entityType: "JobPreference", entityId: updated.id });
    return updated;
  },
};
