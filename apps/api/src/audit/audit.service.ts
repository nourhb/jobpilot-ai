import type { AuditAction, Prisma } from "@prisma/client";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { logger } from "../lib/logger";

/**
 * Section 63/86 of the spec: every important event is logged, but never
 * with sensitive payloads (passwords, CV content, full application
 * answers). Callers pass only non-sensitive metadata.
 */
export const auditService = {
  async log(
    action: AuditAction,
    options: { userId?: string | null; entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue } = {},
  ): Promise<void> {
    try {
      await auditLogRepository.create({
        action,
        userId: options.userId ?? null,
        entityType: options.entityType,
        entityId: options.entityId,
        metadata: options.metadata,
      });
    } catch (error) {
      // Audit logging must never break the primary request flow, but a
      // failure here is still a real problem worth surfacing loudly.
      logger.error({ err: error, action }, "Failed to write audit log");
    }
  },
};
