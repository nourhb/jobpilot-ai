import { z } from "zod";
import { REMOTE_PREFERENCES, WORK_AUTHORIZATION_STATUSES } from "../constants";

export const profileUpdateSchema = z.object({
  professionalSummary: z.string().max(2000).nullish(),
  yearsOfExperience: z.number().min(0).max(60).nullish(),
  workAuthorization: z.enum(WORK_AUTHORIZATION_STATUSES).nullish(),
  requiresSponsorship: z.boolean().optional(),
  willingToRelocate: z.boolean().optional(),
  remotePreference: z.enum(REMOTE_PREFERENCES).nullish(),
  minimumSalary: z.number().int().min(0).max(10_000_000).nullish(),
  maximumSalary: z.number().int().min(0).max(10_000_000).nullish(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const workExperienceInputSchema = z
  .object({
    company: z.string().min(1).max(200),
    jobTitle: z.string().min(1).max(200),
    location: z.string().max(200).nullish(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullish(),
    isCurrent: z.boolean().default(false),
    description: z.string().max(4000).nullish(),
  })
  .refine((v) => v.isCurrent || v.endDate === undefined || v.endDate === null || v.endDate >= v.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });
export type WorkExperienceInput = z.infer<typeof workExperienceInputSchema>;

export const educationInputSchema = z
  .object({
    institution: z.string().min(1).max(200),
    degree: z.string().min(1).max(200),
    field: z.string().max(200).nullish(),
    startDate: z.coerce.date().nullish(),
    endDate: z.coerce.date().nullish(),
    description: z.string().max(4000).nullish(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate >= v.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );
export type EducationInput = z.infer<typeof educationInputSchema>;

export const skillInputSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(100).nullish(),
  proficiency: z.string().max(50).nullish(),
  yearsExperience: z.number().min(0).max(60).nullish(),
});
export type SkillInput = z.infer<typeof skillInputSchema>;

export const certificationInputSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).nullish(),
  issuedAt: z.coerce.date().nullish(),
  expiresAt: z.coerce.date().nullish(),
});
export type CertificationInput = z.infer<typeof certificationInputSchema>;

/**
 * Body for POST /api/profile/verify -- the explicit "user confirms the
 * profile" gesture from section 82 that promotes resume-parser rows from
 * `verified: false` to `verified: true`, making them eligible for the
 * truth layer (section 24).
 */
export const verifyProfileItemsSchema = z.object({
  workExperienceIds: z.array(z.string().uuid()).default([]),
  educationIds: z.array(z.string().uuid()).default([]),
  skillIds: z.array(z.string().uuid()).default([]),
  certificationIds: z.array(z.string().uuid()).default([]),
});
export type VerifyProfileItemsInput = z.infer<typeof verifyProfileItemsSchema>;
