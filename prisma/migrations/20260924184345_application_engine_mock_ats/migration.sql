-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DISCOVERED', 'NORMALIZED', 'MATCHED', 'QUALIFIED', 'PREPARING', 'VALIDATING', 'READY', 'SUBMITTING', 'SUBMITTED', 'MANUAL_REVIEW', 'BLOCKED', 'FAILED', 'SKIPPED', 'DUPLICATE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('PROFILE_FACT', 'EXPERIENCE_FACT', 'EDUCATION_FACT', 'YES_NO_FACT', 'PREFERENCE', 'MOTIVATIONAL', 'UNKNOWN', 'LEGAL', 'HIGH_RISK');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'QUALIFIED',
    "idempotencyKey" TEXT NOT NULL,
    "jobSnapshot" JSONB NOT NULL,
    "candidateSnapshot" JSONB NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchCategory" "MatchCategory" NOT NULL,
    "manualReviewReason" TEXT,
    "blockedReason" TEXT,
    "failureReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "externalApplicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_letters" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_answers" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "status" TEXT NOT NULL,
    "answer" TEXT,
    "source" TEXT,
    "blockedReason" TEXT,
    "factCheckValid" BOOLEAN,
    "factCheckConfidence" DOUBLE PRECISION,
    "factCheckUnsupported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiModel" TEXT,
    "aiPromptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_idempotencyKey_key" ON "applications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "applications"("userId");

-- CreateIndex
CREATE INDEX "applications_jobId_idx" ON "applications"("jobId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_userId_jobId_key" ON "applications"("userId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "cover_letters_applicationId_key" ON "cover_letters"("applicationId");

-- CreateIndex
CREATE INDEX "application_answers_applicationId_idx" ON "application_answers"("applicationId");

-- CreateIndex
CREATE INDEX "application_events_applicationId_idx" ON "application_events"("applicationId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
