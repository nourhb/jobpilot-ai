import type { NormalizedJob, RawJob } from "../base/types";
import type { AshbyRawJobData } from "../adapters/ashby/ashby.types";
import { inferExperienceLevel } from "./infer";

function parseLocation(raw: string): NormalizedJob["location"] {
  if (!raw) return {};
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length >= 3) return { raw, city: parts[0], province: parts[1], country: parts[2] };
  if (parts.length === 2) return { raw, province: parts[0], country: parts[1] };
  return { raw, country: parts[0] };
}

function toEmploymentType(value: string | undefined): NormalizedJob["employmentType"] {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("full")) return "FULL_TIME";
  if (lower.includes("part")) return "PART_TIME";
  if (lower.includes("contract") || lower.includes("temp")) return "CONTRACT";
  if (lower.includes("intern")) return "INTERNSHIP";
  return "UNKNOWN";
}

/** Spec section 19 (Job Normalization) for Ashby. Like Lever, Ashby is modeled with a real `submitApplication`, so this normalizes to `application.type: "API"`. */
export function normalizeAshbyJob(rawJob: RawJob): NormalizedJob {
  const data = rawJob.raw as AshbyRawJobData;

  return {
    externalId: data.id,
    title: data.title,
    company: data.organizationName,
    description: data.descriptionPlain ?? "",
    descriptionHtml: data.descriptionHtml,
    location: parseLocation(data.location),
    remoteType: data.isRemote ? "REMOTE" : data.location ? "ONSITE" : "UNKNOWN",
    employmentType: toEmploymentType(data.employmentType),
    experienceLevel: inferExperienceLevel(data.title, data.descriptionPlain),
    jobUrl: data.jobUrl,
    application: { type: "API", url: data.applyUrl ?? data.jobUrl },
    postedAt: data.publishedAt,
    raw: data,
  };
}
