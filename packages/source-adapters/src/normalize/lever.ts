import type { NormalizedJob, RawJob } from "../base/types";
import type { LeverRawJobData } from "../adapters/lever/lever.types";

function parseLocation(raw: string | undefined): NormalizedJob["location"] {
  if (!raw) return {};
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length >= 3) return { raw, city: parts[0], province: parts[1], country: parts[2] };
  if (parts.length === 2) return { raw, province: parts[0], country: parts[1] };
  return { raw, country: parts[0] };
}

function toRemoteType(workplaceType: string | undefined): NormalizedJob["remoteType"] {
  switch (workplaceType) {
    case "remote":
      return "REMOTE";
    case "hybrid":
      return "HYBRID";
    case "on-site":
      return "ONSITE";
    default:
      return "UNKNOWN";
  }
}

function toEmploymentType(commitment: string | undefined): NormalizedJob["employmentType"] {
  const lower = (commitment ?? "").toLowerCase();
  if (lower.includes("full")) return "FULL_TIME";
  if (lower.includes("part")) return "PART_TIME";
  if (lower.includes("contract") || lower.includes("temp")) return "CONTRACT";
  if (lower.includes("intern")) return "INTERNSHIP";
  return "UNKNOWN";
}

/** Spec section 19 (Job Normalization) for Lever. Lever is the only real source with a documented `submitApplication`, so unlike Greenhouse this normalizes to `application.type: "API"`. */
export function normalizeLeverJob(rawJob: RawJob): NormalizedJob {
  const data = rawJob.raw as LeverRawJobData;

  return {
    externalId: data.id,
    title: data.text,
    company: data.companyName,
    description: data.descriptionPlain ?? "",
    descriptionHtml: data.description,
    location: parseLocation(data.categories.location),
    remoteType: toRemoteType(data.workplaceType),
    employmentType: toEmploymentType(data.categories.commitment),
    jobUrl: data.hostedUrl,
    application: { type: "API", url: data.applyUrl ?? data.hostedUrl },
    postedAt: new Date(data.createdAt).toISOString(),
    raw: data,
  };
}
