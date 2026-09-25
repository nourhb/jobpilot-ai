import { z } from "zod";
import { WORK_AUTHORIZATION_STATUSES } from "@jobpilot/shared";

/**
 * Mirrors `ResumeExtraction` from @jobpilot/shared. This is the schema
 * passed to `AIProvider.generateStructured` (section 22) -- every
 * provider implementation, including the mock, must produce data that
 * validates against exactly this shape. (No explicit `z.ZodType<T>`
 * annotation here: the array fields use `.default([])`, which makes this
 * schema's input type narrower than its output type, so it is checked
 * for structural compatibility with `ResumeExtraction` at the call site
 * in resume.parser.ts instead.)
 */
export const resumeExtractionSchema = z.object({
  personal: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    linkedinUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
  }),
  summary: z.string().optional(),
  workAuthorization: z.enum(WORK_AUTHORIZATION_STATUSES).optional(),
  yearsOfExperience: z.number().min(0).max(60).optional(),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        yearsExperience: z.number().min(0).max(60).optional(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().min(1),
        jobTitle: z.string().min(1),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isCurrent: z.boolean().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().min(1),
        degree: z.string().min(1),
        field: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().min(1),
        issuer: z.string().optional(),
        issuedAt: z.string().optional(),
        expiresAt: z.string().optional(),
      }),
    )
    .default([]),
  languages: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .default([]),
});
