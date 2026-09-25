import { createHash } from "node:crypto";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import type { QuestionAnswerResult } from "@jobpilot/shared";
import { generateCoverLetter } from "@jobpilot/ai";
import { applicationRepository } from "../repositories/application.repository";
import { coverLetterRepository } from "../repositories/coverLetter.repository";
import { applicationAnswerRepository } from "../repositories/applicationAnswer.repository";
import { applicationEventRepository } from "../repositories/applicationEvent.repository";
import { jobRepository } from "../repositories/job.repository";
import { jobPreferenceRepository } from "../repositories/jobPreference.repository";
import { jobMatchService } from "../matching/jobMatch.service";
import { computeHybridScore } from "../matching/scoring";
import { profileService } from "../profile/profile.service";
import { getAIProvider } from "../lib/aiProvider";
import { generateAnswerForQuestion } from "../questions/answerGenerator";
import { resolveApplicationAdapter } from "./adapters/applicationRouter";
import { CaptchaDetectedError } from "./adapters/applicationAdapter.types";
import { validateApplication } from "./applicationValidator";
import { evaluateApplication } from "./policyEngine";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { notificationService } from "../notifications/notification.service";

/** Section 42: `hash(userId + source + externalJobId)` -- must always reduce to the same value for the same (user, job) pair, independent of *when* it's computed. */
function computeIdempotencyKey(userId: string, sourceType: string, externalId: string): string {
  return createHash("sha256").update(`${userId}:${sourceType}:${externalId}`).digest("hex");
}

const RETRYABLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set(["MANUAL_REVIEW", "FAILED", "BLOCKED", "SKIPPED"]);

async function notifyTerminalStatus(userId: string, applicationId: string, status: ApplicationStatus, message: string) {
  if (status === "SUBMITTED") {
    await notificationService.notify({
      userId,
      type: "APPLICATION_SUBMITTED",
      title: "Application submitted",
      body: message,
      entityType: "Application",
      entityId: applicationId,
    });
  } else if (status === "FAILED") {
    await notificationService.notify({
      userId,
      type: "APPLICATION_FAILED",
      title: "Application failed",
      body: message,
      entityType: "Application",
      entityId: applicationId,
    });
  } else if (status === "MANUAL_REVIEW") {
    await notificationService.notify({
      userId,
      type: "MANUAL_REVIEW_REQUIRED",
      title: "Manual review required",
      body: message,
      entityType: "Application",
      entityId: applicationId,
    });
  }
}

async function setStatus(
  applicationId: string,
  status: ApplicationStatus,
  message: string,
  extra: Partial<{ manualReviewReason: string | null; blockedReason: string | null; failureReason: string | null }> = {},
  userId?: string,
) {
  await applicationRepository.updateStatus(applicationId, { status, ...extra });
  await applicationEventRepository.record(applicationId, status, message);
  if (userId) await notifyTerminalStatus(userId, applicationId, status, message);
}

/**
 * Section 35 (Application Workflow) end to end, and the ONLY place all
 * of Phases 4-6 come together:
 *
 *   Job -> Eligibility/Match (Phase 4) -> Duplicate check ->
 *   Generate cover letter (Phase 5) -> Get application form ->
 *   Map fields -> Generate answers (Phase 5) -> Validate (section 36) ->
 *   Risk scan / Policy Engine (section 78) -> Submit -> Verify response
 *   -> Save application.
 *
 * Section 77's "Zero Mistake" architecture is enforced structurally
 * here: nothing produced by the AI provider (cover letter, an
 * AI-grounded question answer) reaches `adapter.submit()` without first
 * passing through `validateApplication` AND `evaluateApplication` --
 * there is no code path from "AI output" directly to "submit".
 */
export const applicationService = {
  async createAndProcess(userId: string, jobId: string, options: { force?: boolean } = {}) {
    const job = await jobRepository.findByIdWithSource(jobId);
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");

    const existing = await applicationRepository.findByUserAndJob(userId, jobId);
    if (existing) {
      // Section 42 / RULE-006: idempotent by construction. Re-requesting
      // an application for the same job never creates a second row --
      // callers should use retry() to re-attempt a failed one.
      return applicationRepository.findById(existing.id);
    }

    const match = await jobMatchService.getOrComputeMatch(userId, jobId);
    if (match.decision === "SKIP" && !options.force) {
      throw new AppError(422, "MATCH_SKIPPED", "This job was skipped by matching and is not eligible for application.");
    }

    const profile = await profileService.getVerifiedCandidateProfile(userId);
    const idempotencyKey = computeIdempotencyKey(userId, job.source.type, job.externalId);

    const application = await applicationRepository.create({
      userId,
      jobId,
      idempotencyKey,
      // Immutable snapshots (master prompt) -- captured once, never
      // updated even if the underlying Job/Profile change later.
      jobSnapshot: {
        title: job.title,
        company: job.company,
        description: job.description,
        city: job.city,
        province: job.province,
        country: job.country,
        remoteType: job.remoteType,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        applicationUrl: job.applicationUrl,
      } satisfies Prisma.InputJsonValue,
      candidateSnapshot: profile as unknown as Prisma.InputJsonValue,
      matchScore: match.score,
      matchCategory: match.matchCategory,
    });
    await applicationEventRepository.record(application.id, "QUALIFIED", "Application created from a qualifying match.");

    return this.process(userId, application.id);
  },

  /** Re-runs the pipeline from PREPARING onward for an existing Application -- shared by createAndProcess() and retry(). */
  async process(userId: string, applicationId: string) {
    const application = await applicationRepository.findOwnedById(userId, applicationId);
    if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");

    const job = await jobRepository.findByIdWithSource(application.jobId);
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");

    const [profile, preferences] = await Promise.all([
      profileService.getVerifiedCandidateProfile(userId),
      jobPreferenceRepository.getOrCreateForUser(userId),
    ]);

    await setStatus(application.id, "PREPARING", "Generating cover letter and application answers.", {}, userId);

    // matchedSkills isn't persisted on JobMatch -- recomputing the
    // (cheap, pure, deterministic) hybrid score here just to foreground
    // the right skills in the cover letter is simpler than a schema
    // change, and never affects the actual match score already stored.
    const breakdown = computeHybridScore(job, profile, preferences);
    const coverLetterResult = await generateCoverLetter(getAIProvider(), job, profile, { matchedSkills: breakdown.matchedSkills });
    await coverLetterRepository.upsert({
      applicationId: application.id,
      content: coverLetterResult.content,
      model: coverLetterResult.model,
      promptVersion: coverLetterResult.promptVersion,
    });

    const adapter = resolveApplicationAdapter(job.source);
    if (!adapter) {
      const reason = "This job's source does not support automated submission yet.";
      await setStatus(application.id, "MANUAL_REVIEW", reason, { manualReviewReason: reason }, userId);
      return applicationRepository.findById(application.id);
    }

    let jobIsActive = true;
    try {
      jobIsActive = await adapter.isJobStillActive(job);
    } catch (error) {
      // Don't let a flaky availability check alone stop the pipeline --
      // let the submission step itself fail loudly if the source is
      // really down.
      logger.warn({ err: error, applicationId }, "Adapter availability check failed; proceeding.");
    }

    if (!jobIsActive) {
      await setStatus(application.id, "EXPIRED", "The job posting is no longer active at the source.", {}, userId);
      return applicationRepository.findById(application.id);
    }

    let questions;
    try {
      questions = await adapter.getQuestions(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not retrieve the application form.";
      await setStatus(application.id, "FAILED", message, { failureReason: message }, userId);
      return applicationRepository.findById(application.id);
    }

    const answered: Array<{ questionText: string; result: QuestionAnswerResult }> = [];
    for (const question of questions) {
      const result = await generateAnswerForQuestion(getAIProvider(), question.text, profile, job);
      answered.push({ questionText: question.text, result });
    }
    await applicationAnswerRepository.replaceAll(
      application.id,
      answered.map((a) => ({ applicationId: application.id, questionText: a.questionText, result: a.result })),
    );

    await setStatus(application.id, "VALIDATING", "Running application validation and policy checks.", {}, userId);

    const hasResume = (await profileService.listResumes(userId)).length > 0;
    const validation = validateApplication({
      profile,
      hasResume,
      coverLetter: coverLetterResult.content,
      answers: answered.map((a) => a.result),
      jobIsActive,
      isDuplicate: false, // enforced structurally at creation time (unique(userId, jobId))
      adapterSupported: true,
    });

    const policy = evaluateApplication({
      job,
      preferences,
      isDuplicate: false,
      hasBlockedAnswer: answered.some((a) => a.result.status === "BLOCKED"),
      hasFailedFactCheck: answered.some((a) => a.result.factCheck?.valid === false),
      adapterSupported: true,
    });

    if (!validation.passed || !policy.allowed) {
      const reasons = [
        ...validation.checks.filter((c) => !c.passed).map((c) => c.reason ?? `${c.name} check failed.`),
        ...policy.reasons,
      ];
      const combined = reasons.join("; ");

      if (policy.requiresManualReview || answered.some((a) => a.result.status === "BLOCKED")) {
        await setStatus(application.id, "MANUAL_REVIEW", combined, { manualReviewReason: combined }, userId);
      } else {
        await setStatus(application.id, "BLOCKED", combined, { blockedReason: combined }, userId);
      }
      return applicationRepository.findById(application.id);
    }

    await setStatus(application.id, "READY", "Passed validation and policy checks.", {}, userId);
    await setStatus(application.id, "SUBMITTING", `Submitting via ${adapter.name}.`, {}, userId);

    try {
      const submission = await adapter.submit(job, {
        candidateName: `${profile.identity.firstName} ${profile.identity.lastName}`,
        candidateEmail: profile.identity.email,
        coverLetter: coverLetterResult.content,
        answers: answered.map((a) => ({ questionId: a.questionText, questionText: a.questionText, answer: a.result.answer ?? "" })),
      });

      await applicationRepository.updateStatus(application.id, {
        status: "SUBMITTED",
        submittedAt: new Date(),
        externalApplicationId: submission.externalApplicationId,
      });
      await applicationEventRepository.record(application.id, "SUBMITTED", `Submitted successfully via ${adapter.name}.`);
      await notifyTerminalStatus(userId, application.id, "SUBMITTED", `Submitted successfully via ${adapter.name}.`);
    } catch (error) {
      if (error instanceof CaptchaDetectedError) {
        const reason = "CAPTCHA detected during submission.";
        await setStatus(application.id, "MANUAL_REVIEW", reason, { manualReviewReason: reason }, userId);
      } else {
        const message = error instanceof Error ? error.message : "Unknown submission error.";
        await setStatus(application.id, "FAILED", message, { failureReason: message }, userId);
      }
    }

    return applicationRepository.findById(application.id);
  },

  async retry(userId: string, applicationId: string) {
    const application = await applicationRepository.findOwnedById(userId, applicationId);
    if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    if (!RETRYABLE_STATUSES.has(application.status)) {
      throw new AppError(409, "APPLICATION_NOT_RETRYABLE", `Application status "${application.status}" cannot be retried.`);
    }

    await applicationRepository.updateStatus(application.id, {
      status: "QUALIFIED",
      manualReviewReason: null,
      blockedReason: null,
      failureReason: null,
    });
    await applicationEventRepository.record(
      application.id,
      "QUALIFIED",
      application.status === "SKIPPED" ? "Unskipped by the user." : "Retrying application.",
    );

    return this.process(userId, applicationId);
  },

  async markSubmitted(userId: string, applicationId: string) {
    const application = await applicationRepository.findOwnedById(userId, applicationId);
    if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    if (application.status !== "MANUAL_REVIEW") {
      throw new AppError(409, "APPLICATION_NOT_MARKABLE", "Only a manual-review application can be marked as submitted.");
    }

    await applicationRepository.updateStatus(application.id, { status: "SUBMITTED", submittedAt: new Date() });
    await applicationEventRepository.record(application.id, "SUBMITTED", "Marked submitted by the user after a manual review.");
    await notifyTerminalStatus(userId, application.id, "SUBMITTED", "Marked submitted by the user after a manual review.");
    return applicationRepository.findById(application.id);
  },

  async skip(userId: string, applicationId: string) {
    const application = await applicationRepository.findOwnedById(userId, applicationId);
    if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    if (application.status === "SUBMITTED") {
      throw new AppError(409, "APPLICATION_ALREADY_SUBMITTED", "This application has already been submitted and cannot be skipped.");
    }

    await applicationEventRepository.record(application.id, "SKIPPED", "Manually skipped by the user.");
    return applicationRepository.updateStatus(application.id, { status: "SKIPPED" });
  },

  async list(userId: string, filters: { status?: ApplicationStatus; page: number; pageSize: number }) {
    const { items, total } = await applicationRepository.list(userId, filters);
    return {
      items,
      pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
    };
  },

  async getById(userId: string, applicationId: string) {
    const application = await applicationRepository.findOwnedById(userId, applicationId);
    if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    return application;
  },
};
