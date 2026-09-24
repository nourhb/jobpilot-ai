import type { NormalizedJob, RawJob } from "../base/types";
import type { GreenhouseRawJobData } from "../adapters/greenhouse/greenhouse.types";

function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessRemoteType(locationName: string): NormalizedJob["remoteType"] {
  const lower = locationName.toLowerCase();
  if (lower.includes("remote")) return "REMOTE";
  if (lower.includes("hybrid")) return "HYBRID";
  return locationName ? "ONSITE" : "UNKNOWN";
}

function parseLocation(raw: string): NormalizedJob["location"] {
  if (!raw) return {};
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length >= 3) return { raw, city: parts[0], province: parts[1], country: parts[2] };
  if (parts.length === 2) return { raw, province: parts[0], country: parts[1] };
  return { raw, country: parts[0] };
}

/** Spec section 19 (Job Normalization) for Greenhouse. Greenhouse's public API doesn't expose salary, employment type or a machine-readable posted date beyond `updated_at`, so those normalize to UNKNOWN/undefined rather than being guessed. */
export function normalizeGreenhouseJob(rawJob: RawJob): NormalizedJob {
  const data = rawJob.raw as GreenhouseRawJobData;

  return {
    externalId: String(data.id),
    title: data.title,
    company: data.companyName,
    description: stripHtml(data.content),
    descriptionHtml: data.content,
    location: parseLocation(data.location?.name ?? ""),
    remoteType: guessRemoteType(data.location?.name ?? ""),
    employmentType: "UNKNOWN",
    jobUrl: data.absolute_url,
    application: { type: "MANUAL", url: data.absolute_url },
    postedAt: data.updated_at,
    raw: data,
  };
}
