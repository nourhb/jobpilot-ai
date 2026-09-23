import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateAuditLogInput {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

export const auditLogRepository = {
  create(input: CreateAuditLogInput) {
    return prisma.auditLog.create({ data: input });
  },
};
