import type { Certification, Education, Profile, Skill, User, WorkExperience } from "@prisma/client";
import type { VerifiedCandidateProfile } from "@jobpilot/shared";

/**
 * Section 24: "This is the only object allowed to feed application
 * answers." Every list here is filtered to `verified === true` INSIDE
 * this function -- never by the caller -- so there is exactly one place
 * in the codebase where the truth-layer boundary can be gotten wrong.
 *
 * Nothing that calls this function (matching, cover letters, application
 * question answering -- Phases 4/5/6) may read Profile/WorkExperience/
 * Education/Skill/Certification rows directly; they must go through
 * `buildVerifiedCandidateProfile`.
 */
export function buildVerifiedCandidateProfile(
  user: Pick<User, "firstName" | "lastName" | "email" | "phone" | "country">,
  profile: Profile,
  experiences: WorkExperience[],
  educations: Education[],
  skills: Skill[],
  certifications: Certification[],
): VerifiedCandidateProfile {
  return {
    identity: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
    authorization: {
      country: user.country ?? "Canada",
      status: profile.workAuthorization,
      requiresSponsorship: profile.requiresSponsorship,
    },
    professionalSummary: profile.professionalSummary,
    yearsOfExperience: profile.yearsOfExperience,
    willingToRelocate: profile.willingToRelocate,
    remotePreference: profile.remotePreference,
    salaryExpectation: {
      minimum: profile.minimumSalary,
      maximum: profile.maximumSalary,
    },
    experience: experiences
      .filter((e) => e.verified)
      .map((e) => ({
        id: e.id,
        company: e.company,
        jobTitle: e.jobTitle,
        location: e.location,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        isCurrent: e.isCurrent,
        description: e.description,
      })),
    education: educations
      .filter((e) => e.verified)
      .map((e) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startDate ? e.startDate.toISOString() : null,
        endDate: e.endDate ? e.endDate.toISOString() : null,
        description: e.description,
      })),
    skills: skills
      .filter((s) => s.verified)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: s.yearsExperience,
      })),
    certifications: certifications
      .filter((c) => c.verified)
      .map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        issuedAt: c.issuedAt ? c.issuedAt.toISOString() : null,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      })),
  };
}
