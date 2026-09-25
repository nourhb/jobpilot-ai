import type { JobSourceAdapter, RawJob } from "../../base/types";
import { resilientFetch } from "../../http/resilientFetch";

/**
 * Public job-board JSON APIs that document programmatic access.
 * These are not scrapers: each endpoint is published for reuse.
 * LinkedIn / Indeed / Google Jobs are intentionally absent.
 */
export type PublicFeedName =
  | "remoteok"
  | "arbeitnow"
  | "jobicy"
  | "remotive"
  | "themuse"
  | "himalayas"
  | "workingnomads"
  | "weworkremotely"
  | "smartrecruiters";

export interface PublicFeedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remote: boolean;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jobUrl?: string;
  postedAt?: string;
}

export interface PublicFeedsAdapterConfig {
  feed: PublicFeedName;
}

const USER_AGENT = "JobPilotAI/1.0 (authorized public job-board discovery)";

function headers(): HeadersInit {
  return { Accept: "application/json", "User-Agent": USER_AGENT };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

function number(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function postedAt(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value > 1e12 ? value : value * 1000).toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const numeric = Number(value);
  if (/^\d+(\.\d+)?$/.test(value.trim()) && Number.isFinite(numeric)) {
    return new Date(numeric > 1e12 ? numeric : numeric * 1000).toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await resilientFetch(url, { headers: headers(), timeoutMs: 25_000, retries: 1 });
  if (!response.ok) {
    throw new Error(`Public feed ${url} returned ${response.status}`);
  }
  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await resilientFetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": USER_AGENT }, timeoutMs: 25_000, retries: 1 });
  if (!response.ok) {
    throw new Error(`Public feed ${url} returned ${response.status}`);
  }
  return response.text();
}

function mapRemoteOk(payload: unknown): PublicFeedJob[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .slice(1)
    .map((row) => {
      const item = asRecord(row);
      const id = text(item.id || item.slug);
      return {
        externalId: id,
        title: text(item.position || item.title),
        company: text(item.company),
        description: text(item.description),
        location: text(item.location) || "Remote",
        remote: true,
        salaryMin: number(item.salary_min),
        salaryMax: number(item.salary_max),
        jobUrl: text(item.url || item.apply_url),
        postedAt: postedAt(item.date),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapArbeitnow(payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(asRecord(payload).data) ? (asRecord(payload).data as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      return {
        externalId: text(item.slug || item.url),
        title: text(item.title),
        company: text(item.company_name),
        description: text(item.description),
        location: text(item.location) || "Remote",
        remote: Boolean(item.remote),
        jobUrl: text(item.url),
        postedAt: postedAt(item.created_at),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapJobicy(payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(asRecord(payload).jobs) ? (asRecord(payload).jobs as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      return {
        externalId: text(item.id || item.url),
        title: text(item.jobTitle || item.title),
        company: text(item.companyName),
        description: text(item.jobDescription || item.description),
        location: text(item.jobGeo) || "Remote",
        remote: true,
        employmentType: text(item.jobType) || undefined,
        salaryMin: number(item.annualSalaryMin || item.salaryMin),
        salaryMax: number(item.annualSalaryMax || item.salaryMax),
        salaryCurrency: text(item.salaryCurrency) || undefined,
        jobUrl: text(item.url || item.jobUrl),
        postedAt: postedAt(item.pubDate),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapRemotive(payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(asRecord(payload).jobs) ? (asRecord(payload).jobs as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      const location = text(item.candidate_required_location) || "Remote";
      return {
        externalId: text(item.id),
        title: text(item.title),
        company: text(item.company_name),
        description: text(item.description),
        location,
        remote: /anywhere|remote|worldwide/i.test(location),
        employmentType: text(item.job_type) || undefined,
        jobUrl: text(item.url),
        postedAt: postedAt(item.publication_date),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapTheMuse(payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(asRecord(payload).results) ? (asRecord(payload).results as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      const company = asRecord(item.company);
      const refs = asRecord(item.refs);
      const locations = Array.isArray(item.locations) ? item.locations : [];
      const location = locations
        .map((entry) => text(asRecord(entry).name))
        .filter(Boolean)
        .join(" / ");
      const levels = Array.isArray(item.levels) ? item.levels : [];
      return {
        externalId: text(item.id),
        title: text(item.name),
        company: text(company.name),
        description: text(item.contents),
        location: location || "Remote",
        remote: /remote/i.test(location),
        employmentType: text(asRecord(levels[0] ?? {}).name) || undefined,
        jobUrl: text(refs.landing_page || item.landing_page),
        postedAt: postedAt(item.publication_date),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapHimalayas(payload: unknown): PublicFeedJob[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root.jobs)
    ? (root.jobs as unknown[])
    : Array.isArray(root.data)
      ? (root.data as unknown[])
      : Array.isArray(payload)
        ? (payload as unknown[])
        : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      return {
        externalId: text(item.id || item.guid || item.url || item.applicationLink),
        title: text(item.title || item.jobTitle),
        company: text(item.companyName || item.company),
        description: text(item.description || item.excerpt),
        location: text(item.location || item.locationRestrictions) || "Remote",
        remote: true,
        employmentType: text(item.employmentType || item.jobType) || undefined,
        salaryMin: number(item.minSalary || item.salaryMin),
        salaryMax: number(item.maxSalary || item.salaryMax),
        jobUrl: text(item.applicationLink || item.url || item.guid),
        postedAt: postedAt(item.pubDate || item.publishedAt || item.createdAt),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mergeJobs(batches: PublicFeedJob[][]): PublicFeedJob[] {
  const seen = new Set<string>();
  const merged: PublicFeedJob[] = [];
  for (const batch of batches) {
    for (const job of batch) {
      if (seen.has(job.externalId)) continue;
      seen.add(job.externalId);
      merged.push(job);
    }
  }
  return merged;
}

async function loadRemoteOk(): Promise<PublicFeedJob[]> {
  return mapRemoteOk(await fetchJson("https://remoteok.com/api"));
}

async function loadArbeitnow(): Promise<PublicFeedJob[]> {
  const batches: PublicFeedJob[][] = [];
  for (let page = 1; page <= 12; page += 1) {
    const jobs = mapArbeitnow(await fetchJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`));
    if (jobs.length === 0) break;
    batches.push(jobs);
    if (jobs.length < 20) break;
  }
  return mergeJobs(batches);
}

async function loadJobicy(): Promise<PublicFeedJob[]> {
  const tags = ["software-dev", "data-science", "devops", "design", "product", "business", "copywriting"];
  const batches = await Promise.all(
    tags.map(async (tag) => {
      try {
        return mapJobicy(await fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=100&tag=${tag}`));
      } catch {
        return [];
      }
    }),
  );
  return mergeJobs(batches);
}

async function loadRemotive(): Promise<PublicFeedJob[]> {
  const categories = [
    "",
    "software-dev",
    "data",
    "devops",
    "qa",
    "design",
    "product",
    "marketing",
    "customer-service",
    "writing",
    "business",
  ];
  const batches = await Promise.all(
    categories.map(async (category) => {
      try {
        const suffix = category ? `?category=${category}` : "";
        return mapRemotive(await fetchJson(`https://remotive.com/api/remote-jobs${suffix}`));
      } catch {
        return [];
      }
    }),
  );
  return mergeJobs(batches);
}

async function loadTheMuse(): Promise<PublicFeedJob[]> {
  const categories = ["Software Engineer", "Data Science", "Design and UX", "Project Management"];
  const batches: PublicFeedJob[][] = [];
  for (const category of categories) {
    for (let page = 0; page < 8; page += 1) {
      const url = `https://www.themuse.com/api/public/jobs?page=${page}&category=${encodeURIComponent(category)}`;
      const payload = asRecord(await fetchJson(url));
      const jobs = mapTheMuse(payload);
      if (jobs.length === 0) break;
      batches.push(jobs);
      const pageCount = number(payload.page_count) ?? 0;
      if (page + 1 >= pageCount) break;
    }
  }
  return mergeJobs(batches);
}

async function loadHimalayas(): Promise<PublicFeedJob[]> {
  return mapHimalayas(await fetchJson("https://himalayas.app/jobs/api?limit=200"));
}

function mapWorkingNomads(payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(asRecord(payload).jobs) ? (asRecord(payload).jobs as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      return {
        externalId: text(item.id || item.slug || item.url),
        title: text(item.title),
        company: text(item.company_name || item.company),
        description: text(item.description),
        location: text(item.location) || "Remote",
        remote: true,
        employmentType: text(item.job_type || item.type) || undefined,
        jobUrl: text(item.url || item.apply_url),
        postedAt: postedAt(item.pub_date || item.published_at || item.created_at),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapRssItems(xml: string): PublicFeedJob[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item, index) => {
      const tag = (name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";
      const title = tag("title");
      const link = tag("link") || tag("guid");
      const [company, role] = title.includes(":") ? title.split(/:(.+)/).map((part) => part.trim()) : ["", title];
      return {
        externalId: link || `${title}-${index}`,
        title: role || title,
        company: company || "We Work Remotely",
        description: tag("description"),
        location: "Remote",
        remote: true,
        jobUrl: link,
        postedAt: postedAt(tag("pubDate")),
      };
    })
    .filter((job) => job.externalId && job.title);
}

function mapSmartRecruiters(company: string, payload: unknown): PublicFeedJob[] {
  const rows = Array.isArray(asRecord(payload).content) ? (asRecord(payload).content as unknown[]) : [];
  return rows
    .map((row) => {
      const item = asRecord(row);
      const location = asRecord(item.location);
      const ref = asRecord(item.ref);
      const city = text(location.city);
      const country = text(location.country);
      return {
        externalId: text(item.id || item.uuid),
        title: text(item.name || item.title),
        company,
        description: text(item.jobAd ? asRecord(asRecord(item.jobAd).sections).jobDescription : item.description),
        location: [city, country].filter(Boolean).join(", ") || "Remote",
        remote: /remote/i.test(`${city} ${country}`),
        employmentType: text(asRecord(item.typeOfEmployment).label) || undefined,
        jobUrl: text(ref.jobAd || item.applyUrl || item.uuid),
        postedAt: postedAt(item.releasedDate || item.createdOn),
      };
    })
    .filter((job) => job.externalId && job.title);
}

async function loadWorkingNomads(): Promise<PublicFeedJob[]> {
  return mapWorkingNomads(await fetchJson("https://www.workingnomads.com/api/exposed_jobs/"));
}

async function loadWeWorkRemotely(): Promise<PublicFeedJob[]> {
  const feeds = [
    "https://weworkremotely.com/remote-jobs.rss",
    "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
    "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    "https://weworkremotely.com/categories/remote-product-jobs.rss",
    "https://weworkremotely.com/categories/remote-design-jobs.rss",
  ];
  const batches = await Promise.all(
    feeds.map(async (url) => {
      try {
        return mapRssItems(await fetchText(url));
      } catch {
        return [];
      }
    }),
  );
  return mergeJobs(batches);
}

async function loadSmartRecruiters(): Promise<PublicFeedJob[]> {
  const companies = ["siemens", "philips", "adidas", "ing", "vodafone", "capgemini", "allianz", "bnpparibas", "deutschebank", "accenture"];
  const batches = await Promise.all(
    companies.map(async (company) => {
      try {
        return mapSmartRecruiters(company, await fetchJson(`https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`));
      } catch {
        return [];
      }
    }),
  );
  return mergeJobs(batches);
}

const LOADERS: Record<PublicFeedName, () => Promise<PublicFeedJob[]>> = {
  remoteok: loadRemoteOk,
  arbeitnow: loadArbeitnow,
  jobicy: loadJobicy,
  remotive: loadRemotive,
  themuse: loadTheMuse,
  himalayas: loadHimalayas,
  workingnomads: loadWorkingNomads,
  weworkremotely: loadWeWorkRemotely,
  smartrecruiters: loadSmartRecruiters,
};

function toRawJob(feed: PublicFeedName, job: PublicFeedJob): RawJob {
  return {
    sourceName: `public:${feed}`,
    externalId: job.externalId,
    raw: job,
    fetchedAt: new Date().toISOString(),
  };
}

export function createPublicFeedsAdapter(config: PublicFeedsAdapterConfig): JobSourceAdapter {
  const feed = config.feed;
  const load = LOADERS[feed];
  if (!load) {
    throw new Error(`Unknown public feed "${String(feed)}"`);
  }

  return {
    sourceName: `public:${feed}`,
    rateLimit: { requestsPerMinute: 10, concurrency: 1 },

    async discoverJobs(): Promise<RawJob[]> {
      const jobs = await load();
      return jobs.map((job) => toRawJob(feed, job));
    },

    async getJobDetails(externalId: string): Promise<RawJob> {
      const jobs = await load();
      const found = jobs.find((job) => job.externalId === externalId);
      if (!found) throw new Error(`Public feed job not found: ${externalId}`);
      return toRawJob(feed, found);
    },
  };
}
