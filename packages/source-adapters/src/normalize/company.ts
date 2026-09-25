import type { NormalizedJob, RawJob } from "../base/types";
import type { PublicFeedJob } from "../adapters/publicFeeds/publicFeeds.adapter";
import { inferEmploymentType, inferExperienceLevel, inferRemoteType } from "./infer";

function parseLocation(raw: string): NormalizedJob["location"] {
  if (!raw) return {};
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length >= 3) return { raw, city: parts[0], province: parts[1], country: parts[2] };
  if (parts.length === 2) return { raw, city: parts[0], country: parts[1] };
  return { raw, country: parts[0] };
}

function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompanyJob(rawJob: RawJob): NormalizedJob {
  const data = rawJob.raw as PublicFeedJob;
  const location = parseLocation(data.location ?? "");

  return {
    externalId: data.externalId,
    title: data.title,
    company: data.company || "Unknown company",
    description: stripHtml(data.description) || data.title,
    location,
    remoteType: data.remote ? "REMOTE" : inferRemoteType(data.location ?? "", data.title),
    employmentType: inferEmploymentType(data.title, data.employmentType),
    experienceLevel: inferExperienceLevel(data.title, data.description),
    salary:
      data.salaryMin || data.salaryMax
        ? { min: data.salaryMin, max: data.salaryMax, currency: data.salaryCurrency ?? "USD", period: "YEAR" }
        : undefined,
    jobUrl: data.jobUrl,
    application: { type: "PUBLIC_FORM", url: data.jobUrl },
    postedAt: data.postedAt,
    raw: data,
  };
}
