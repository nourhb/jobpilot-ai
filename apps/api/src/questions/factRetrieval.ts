import type { VerifiedCandidateProfile } from "@jobpilot/shared";
import type { ResponseShape } from "./questionClassifier";
import type { QuestionCategory } from "@jobpilot/shared";

export interface FactRetrievalResult {
  found: boolean;
  value?: string;
}

const NOT_FOUND: FactRetrievalResult = { found: false };

function found(value: string): FactRetrievalResult {
  return { found: true, value };
}

/** Finds the verified skill (if any) whose name appears in the question text -- e.g. "AWS" in "Do you have AWS experience?". */
function findReferencedSkill(questionText: string, profile: VerifiedCandidateProfile) {
  const lower = questionText.toLowerCase();
  return profile.skills.find((s) => lower.includes(s.name.toLowerCase())) ?? null;
}

function retrieveLegalFact(questionText: string, profile: VerifiedCandidateProfile): FactRetrievalResult {
  const { status, requiresSponsorship } = profile.authorization;

  if (/require.*(sponsorship|visa)/i.test(questionText)) {
    // requiresSponsorship is the authoritative flag for this specific
    // question, independent of the coarser `status` field.
    return found(requiresSponsorship ? "Yes" : "No");
  }

  if (status === null) return NOT_FOUND;
  // "OTHER" is deliberately ambiguous in WORK_AUTHORIZATION_STATUSES --
  // never guess a yes/no legal-authorization answer from it.
  if (status === "OTHER") return NOT_FOUND;

  return found(status === "REQUIRES_SPONSORSHIP" ? "No" : "Yes");
}

function retrieveExperienceFact(
  questionText: string,
  responseShape: ResponseShape,
  profile: VerifiedCandidateProfile,
): FactRetrievalResult {
  const skill = findReferencedSkill(questionText, profile);

  if (responseShape === "YES_NO") {
    // The verified skills list is exhaustive (truth layer, section 24):
    // if a skill isn't listed, the candidate never verified having it,
    // so "No" is a confirmed fact, not a guess (section 61 example: "AWS
    // = 0" -> "NO").
    return found(skill ? "Yes" : "No");
  }

  if (responseShape === "NUMERIC") {
    if (skill && skill.yearsExperience !== null) return found(String(skill.yearsExperience));
    if (!skill && profile.yearsOfExperience !== null && /overall|total|professional experience/i.test(questionText)) {
      return found(String(profile.yearsOfExperience));
    }
    // Skill matched but years unknown, or no skill/overall reference at
    // all -- section 32: "If missing: BLOCK APPLICATION rather than
    // guessing."
    return NOT_FOUND;
  }

  // DESCRIPTIVE ("Describe your X experience.") -- only answerable (via
  // AI, grounded in the verified skill) when the skill is actually
  // present; section 61's Terraform example: absent -> BLOCK.
  return skill ? found(skill.name) : NOT_FOUND;
}

function retrieveEducationFact(questionText: string, profile: VerifiedCandidateProfile): FactRetrievalResult {
  if (profile.education.length === 0) return NOT_FOUND;

  const lower = questionText.toLowerCase();
  const matched = profile.education.find(
    (e) => lower.includes(e.degree.toLowerCase()) || (e.field && lower.includes(e.field.toLowerCase())),
  );
  if (matched) return found(`${matched.degree}${matched.field ? ` in ${matched.field}` : ""}`);

  if (/highest level|highest degree/i.test(questionText)) {
    const highest = profile.education[0]!;
    return found(`${highest.degree}${highest.field ? ` in ${highest.field}` : ""}`);
  }

  return NOT_FOUND;
}

function retrievePreferenceFact(questionText: string, profile: VerifiedCandidateProfile): FactRetrievalResult {
  if (/relocat/i.test(questionText)) return found(profile.willingToRelocate ? "Yes" : "No");

  if (/remote|hybrid|on-?site/i.test(questionText)) {
    return profile.remotePreference ? found(profile.remotePreference) : NOT_FOUND;
  }

  if (/salary/i.test(questionText)) {
    const { minimum, maximum } = profile.salaryExpectation;
    if (minimum === null && maximum === null) return NOT_FOUND;
    if (minimum !== null && maximum !== null) return found(`${minimum}-${maximum}`);
    return found(String(minimum ?? maximum));
  }

  // Notice period / start date are not modeled anywhere in the verified
  // profile yet -- BLOCK rather than guess.
  return NOT_FOUND;
}

function retrieveProfileFact(questionText: string, profile: VerifiedCandidateProfile): FactRetrievalResult {
  const lower = questionText.toLowerCase();

  if (lower.includes("first name")) return found(profile.identity.firstName);
  if (lower.includes("last name")) return found(profile.identity.lastName);
  if (lower.includes("full name")) return found(`${profile.identity.firstName} ${profile.identity.lastName}`);
  if (lower.includes("email")) return found(profile.identity.email);
  if (lower.includes("phone")) return profile.identity.phone ? found(profile.identity.phone) : NOT_FOUND;

  return NOT_FOUND;
}

/**
 * Section 31/32: attempts to retrieve a fact for every category except
 * MOTIVATIONAL (AI-generated, handled separately in answerGenerator.ts)
 * and HIGH_RISK (never attempted at all). Returns `found: false` --
 * never a placeholder/guessed value -- whenever the verified profile
 * doesn't actually contain the answer.
 */
export function retrieveFact(
  category: QuestionCategory,
  responseShape: ResponseShape,
  questionText: string,
  profile: VerifiedCandidateProfile,
): FactRetrievalResult {
  switch (category) {
    case "LEGAL":
      return retrieveLegalFact(questionText, profile);
    case "EXPERIENCE_FACT":
      return retrieveExperienceFact(questionText, responseShape, profile);
    case "EDUCATION_FACT":
      return retrieveEducationFact(questionText, profile);
    case "PREFERENCE":
      return retrievePreferenceFact(questionText, profile);
    case "PROFILE_FACT":
      return retrieveProfileFact(questionText, profile);
    case "YES_NO_FACT":
      // No dedicated generic fact store beyond the categories above --
      // BLOCK rather than guess (see questionClassifier.ts's fallback).
      return NOT_FOUND;
    default:
      return NOT_FOUND;
  }
}
