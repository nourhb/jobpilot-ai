function firstHttpUrl(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value.trim();
  }
  return null;
}

function urlFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return matches.find((url) => /apply|jobs|greenhouse|lever|ashby|workable|boards\./i.test(url)) ?? null;
}

export function resolveStoredApplyUrl(job: {
  applicationUrl?: string | null;
  jobUrl?: string | null;
  description?: string | null;
  rawData?: unknown;
}): string | null {
  const direct = firstHttpUrl(job.applicationUrl, job.jobUrl);
  if (direct) return direct;

  const raw = job.rawData && typeof job.rawData === "object" ? (job.rawData as Record<string, unknown>) : {};
  const nested = raw.refs && typeof raw.refs === "object" ? (raw.refs as Record<string, unknown>) : {};
  return (
    firstHttpUrl(
      raw.absolute_url,
      raw.hostedUrl,
      raw.applyUrl,
      raw.apply_url,
      raw.applicationUrl,
      raw.jobUrl,
      raw.url,
      raw.applicationLink,
      nested.landing_page,
      nested.jobAd,
    ) ?? urlFromText(job.description)
  );
}

export function withApplyUrl<T extends { applicationUrl?: string | null; jobUrl?: string | null; description?: string | null; rawData?: unknown }>(
  job: T,
): T {
  const url = resolveStoredApplyUrl(job);
  if (!url) return job;
  return {
    ...job,
    jobUrl: job.jobUrl ?? url,
    applicationUrl: job.applicationUrl ?? url,
  };
}
