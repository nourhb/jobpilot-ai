-- CreateEnum
CREATE TYPE "MatchCategory" AS ENUM ('EXCELLENT', 'STRONG', 'POTENTIAL', 'LOW');

-- CreateEnum
CREATE TYPE "MatchDecision" AS ENUM ('APPLY', 'REVIEW', 'SKIP');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PREFERENCES_UPDATED';

-- CreateTable
CREATE TABLE "job_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countries" TEXT[] DEFAULT ARRAY['Canada']::TEXT[],
    "provinces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "hybrid" BOOLEAN NOT NULL DEFAULT true,
    "onsite" BOOLEAN NOT NULL DEFAULT true,
    "minSalary" INTEGER,
    "maxSalary" INTEGER,
    "employmentTypes" "JobEmploymentType"[] DEFAULT ARRAY[]::"JobEmploymentType"[],
    "experienceLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxDistanceKm" INTEGER,
    "requireWorkAuthorization" BOOLEAN NOT NULL DEFAULT true,
    "requireNoSponsorship" BOOLEAN NOT NULL DEFAULT true,
    "minimumMatchScore" INTEGER NOT NULL DEFAULT 70,
    "autoApplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCoverLetterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoQuestionAnswerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_matches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchCategory" "MatchCategory" NOT NULL,
    "decision" "MatchDecision" NOT NULL,
    "skillsScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "titleScore" INTEGER NOT NULL,
    "locationScore" INTEGER NOT NULL,
    "authorizationScore" INTEGER NOT NULL,
    "salaryScore" INTEGER NOT NULL,
    "employmentTypeScore" INTEGER NOT NULL,
    "preferencesScore" INTEGER NOT NULL,
    "skippedReason" TEXT,
    "aiSuggestedDecision" TEXT,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiModel" TEXT,
    "aiPromptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_preferences_userId_key" ON "job_preferences"("userId");

-- CreateIndex
CREATE INDEX "job_matches_userId_idx" ON "job_matches"("userId");

-- CreateIndex
CREATE INDEX "job_matches_jobId_idx" ON "job_matches"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "job_matches_userId_jobId_key" ON "job_matches"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "job_preferences" ADD CONSTRAINT "job_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
