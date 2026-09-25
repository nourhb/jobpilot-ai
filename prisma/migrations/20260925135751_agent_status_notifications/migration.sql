-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_FAILED', 'MANUAL_REVIEW_REQUIRED', 'INTERVIEW_DETECTED', 'JOB_REMOVED', 'AGENT_STOPPED', 'AI_PROVIDER_UNAVAILABLE', 'SOURCE_UNAVAILABLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'AGENT_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENT_PAUSED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENT_STOPPED';
ALTER TYPE "AuditAction" ADD VALUE 'APPLICATION_SUBMITTED';

-- AlterTable
ALTER TABLE "job_preferences" ADD COLUMN     "agentStatus" "AgentStatus" NOT NULL DEFAULT 'STOPPED';

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
