-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE', 'COMPANY', 'MOCK');

-- CreateEnum
CREATE TYPE "RemoteType" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobApplicationType" AS ENUM ('API', 'PUBLIC_FORM', 'MANUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'JOB_DISCOVERY_RUN';

-- CreateTable
CREATE TABLE "job_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobSourceType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionHtml" TEXT,
    "locationRaw" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "remoteType" "RemoteType" NOT NULL DEFAULT 'UNKNOWN',
    "employmentType" "JobEmploymentType" NOT NULL DEFAULT 'UNKNOWN',
    "experienceLevel" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" TEXT,
    "jobUrl" TEXT,
    "applicationType" "JobApplicationType" NOT NULL DEFAULT 'UNKNOWN',
    "applicationUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "secondaryDedupeKey" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_sources_name_key" ON "job_sources"("name");

-- CreateIndex
CREATE INDEX "jobs_sourceId_idx" ON "jobs"("sourceId");

-- CreateIndex
CREATE INDEX "jobs_externalId_idx" ON "jobs"("externalId");

-- CreateIndex
CREATE INDEX "jobs_contentHash_idx" ON "jobs"("contentHash");

-- CreateIndex
CREATE INDEX "jobs_secondaryDedupeKey_idx" ON "jobs"("secondaryDedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_sourceId_externalId_key" ON "jobs"("sourceId", "externalId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "job_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
