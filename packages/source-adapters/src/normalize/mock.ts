import type { NormalizedJob, RawJob } from "../base/types";
import type { MockRawJobData } from "../adapters/mock.adapter";

function parseLocation(raw: string): NormalizedJob["location"] {
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    return { raw, city: parts[0], province: parts[1], country: parts[2] };
  }
  if (parts.length === 2) {
    return { raw, province: parts[0], country: parts[1] };
  }
  return { raw, country: parts[0] };
}

function toEmploymentType(value: string): NormalizedJob["employmentType"] {
  const allowed: NormalizedJob["employmentType"][] = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERNSHIP"];
  return (allowed as string[]).includes(value) ? (value as NormalizedJob["employmentType"]) : "UNKNOWN";
}

export function normalizeMockJob(rawJob: RawJob): NormalizedJob {
  const data = rawJob.raw as MockRawJobData;

  return {
    externalId: data.externalId,
    title: data.title,
    company: data.company,
    description: data.description,
    location: parseLocation(data.location),
    remoteType: data.remote ? "REMOTE" : "ONSITE",
    employmentType: toEmploymentType(data.employmentType),
    salary:
      data.salaryMin !== undefined || data.salaryMax !== undefined
        ? { min: data.salaryMin, max: data.salaryMax, currency: "CAD", period: "YEAR" }
        : undefined,
    jobUrl: undefined,
    application: { type: "API" },
    postedAt: data.postedAt,
    raw: data,
  };
}
