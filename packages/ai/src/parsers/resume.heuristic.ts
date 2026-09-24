import type { ResumeExtraction } from "@jobpilot/shared";

/**
 * Deterministic, offline, regex/keyword-based resume extraction.
 *
 * This is NOT a substitute for a real LLM extraction -- it is
 * intentionally limited (see docs/architecture.md, "Resume Parsing") and
 * is used in two ways:
 *
 * 1. As the seeded response for `MockAIProvider` in development/tests,
 *    so the full pipeline (schema validation -> confidence scoring ->
 *    review-required gating) can be exercised end-to-end without a real
 *    AI provider configured, and without ever silently pretending the
 *    mock understood a full resume.
 * 2. As a defensive fallback if a real provider call fails.
 *
 * It only extracts what it can find with high confidence (contact info,
 * known skill keywords) and leaves everything else empty -- consistent
 * with "leaving fields empty is preferred over guessing" (section 22/23).
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const LINKEDIN_RE = /(https?:\/\/)?(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/]+/i;
const GITHUB_RE = /(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9\-_/]+/i;

/**
 * Known skill keywords (deliberately the same illustrative list as
 * section 11 of the spec, extended with a handful of very common
 * adjacent technologies). Never treated as an exhaustive or restrictive
 * list elsewhere in the app -- manual entry always accepts free text.
 */
const KNOWN_SKILLS = [
  "Docker",
  "Kubernetes",
  "Azure",
  "AWS",
  "GCP",
  "React",
  "React Native",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Linux",
  "Git",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "Terraform",
  "Ansible",
  "Python",
  "TypeScript",
  "JavaScript",
  "Java",
  "C#",
  "Go",
  "Bash",
  "Prometheus",
  "Grafana",
  "Helm",
  "Nginx",
];

function findFirst(re: RegExp, text: string): string | undefined {
  const match = re.exec(text);
  return match ? match[0] : undefined;
}

function extractSkills(text: string): ResumeExtraction["skills"] {
  const found = new Set<string>();
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i");
    if (re.test(text)) {
      found.add(skill);
    }
  }
  return Array.from(found).map((name) => ({ name }));
}

/** Best-effort guess at the candidate's name from the first non-empty line. */
function extractProbableName(text: string): { firstName?: string; lastName?: string } {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return {};

  const words = firstLine.split(/\s+/).filter(Boolean);
  const looksLikeName =
    words.length >= 2 &&
    words.length <= 4 &&
    words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w)) &&
    !/@|resume|curriculum|cv\b/i.test(firstLine);

  if (!looksLikeName) return {};

  return {
    firstName: words[0],
    lastName: words[words.length - 1],
  };
}

export function heuristicExtractResume(text: string): ResumeExtraction {
  const { firstName, lastName } = extractProbableName(text);

  return {
    personal: {
      firstName,
      lastName,
      email: findFirst(EMAIL_RE, text),
      phone: findFirst(PHONE_RE, text),
      linkedinUrl: findFirst(LINKEDIN_RE, text),
      githubUrl: findFirst(GITHUB_RE, text),
    },
    summary: undefined,
    skills: extractSkills(text),
    experience: [],
    education: [],
    certifications: [],
    languages: [],
    projects: [],
  };
}
