-- AlterTable
ALTER TABLE "job_preferences" ADD COLUMN     "allowedSourceTypes" "JobSourceType"[] DEFAULT ARRAY[]::"JobSourceType"[],
ADD COLUMN     "maxApplicationsPerDay" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "maxApplicationsPerHour" INTEGER NOT NULL DEFAULT 5;
