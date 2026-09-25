import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  JOB_COUNTRY_FILTERS,
  JOB_DOMAIN_LABELS,
  JOB_DOMAINS,
  JOB_EMPLOYMENT_TYPES,
  JOB_EXPERIENCE_LABELS,
  JOB_EXPERIENCE_LEVELS,
  JOB_FIELD_LABELS,
  JOB_FIELDS,
  JOB_REMOTE_TYPES,
  type JobDomain,
  type JobEmploymentType,
  type JobExperienceLevel,
  type JobField,
  type JobRemoteType,
} from "@jobpilot/shared";
import { Bookmark, Search } from "lucide-react";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { useJobs } from "@/hooks/useJobs";
import type { JobRecord } from "@/services/jobsService";

const SAVED_JOBS_KEY = "jobpilot.savedJobs";

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
  INTERNSHIP: "Internship",
  UNKNOWN: "Employment not specified",
};

const REMOTE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
  UNKNOWN: "Location not specified",
};

const FILTER_EMPLOYMENT = JOB_EMPLOYMENT_TYPES.filter((value) => value !== "UNKNOWN");
const FILTER_REMOTE = JOB_REMOTE_TYPES.filter((value) => value !== "UNKNOWN");

const SOURCE_LABELS: Record<string, string> = {
  MOCK: "JobPilot",
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  ASHBY: "Ashby",
  WORKABLE: "Workable",
  COMPANY: "Public feed",
};

const AVATAR_COLORS = [
  "bg-slate-100 text-slate-700",
  "bg-blue-50 text-blue-800",
  "bg-indigo-50 text-indigo-800",
  "bg-stone-100 text-stone-700",
  "bg-sky-50 text-sky-800",
  "bg-zinc-100 text-zinc-700",
];

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) => n.toLocaleString();
  const range = min !== null && max !== null ? `${fmt(min)}–${fmt(max)}` : fmt((min ?? max)!);
  return `${currency ?? "CAD"} ${range}`;
}

function formatPostedAt(value: string | null): string | null {
  if (!value) return null;
  const posted = new Date(value).getTime();
  if (Number.isNaN(posted)) return null;
  const hours = Math.max(0, Math.round((Date.now() - posted) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString();
}

function locationLine(job: JobRecord): string {
  const parts = [job.city, job.province, job.country].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  if (job.locationRaw) return job.locationRaw;
  if (job.remoteType === "REMOTE") return "Remote";
  return "Location not specified";
}

function viaLabel(job: JobRecord): string {
  const type = job.source?.type;
  if (type === "COMPANY" && job.source?.name) return job.source.name;
  return SOURCE_LABELS[type ?? ""] ?? job.source?.name ?? "JobPilot";
}

function companyInitials(company: string): string {
  const words = company.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "J";
}

function avatarClass(company: string): string {
  let hash = 0;
  for (const char of company) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]!;
}

function mentionsDegree(description: string): boolean | null {
  if (/no degree|degree not required|without a degree/i.test(description)) return false;
  if (/\b(degree|bachelor|master|diploma)\b/i.test(description)) return true;
  return null;
}

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function JobsPage() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [employmentType, setEmploymentType] = useState<JobEmploymentType | "">("");
  const [experienceLevel, setExperienceLevel] = useState<JobExperienceLevel | "">("");
  const [remoteType, setRemoteType] = useState<JobRemoteType | "">("");
  const [country, setCountry] = useState("");
  const [field, setField] = useState<JobField | "">("");
  const [domain, setDomain] = useState<JobDomain | "">("");
  const [tab, setTab] = useState<"postings" | "saved">("postings");
  const [savedIds, setSavedIds] = useState<string[]>(() => readSavedIds());
  const { data, isLoading, isError } = useJobs({
    search: tab === "saved" ? undefined : search || undefined,
    employmentType: employmentType || undefined,
    experienceLevel: experienceLevel || undefined,
    remoteType: remoteType || undefined,
    country: country || undefined,
    field: field || undefined,
    domain: domain || undefined,
    page,
    pageSize: 100,
  });
  const hasFilters = Boolean(employmentType || experienceLevel || remoteType || country || field || domain);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(draft.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    setPage(1);
  }, [employmentType, experienceLevel, remoteType, country, field, domain]);

  useEffect(() => {
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return tab === "saved" ? all.filter((job) => savedIds.includes(job.id)) : all;
  }, [data?.items, savedIds, tab]);

  const toggleSaved = (id: string) => {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Find jobs"
        description="Public career boards only. Open a role to score it against your verified profile."
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or company"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <FilterSelect
          label="Work type"
          value={employmentType}
          onChange={(value) => setEmploymentType(value as JobEmploymentType | "")}
          options={FILTER_EMPLOYMENT.map((value) => ({ value, label: EMPLOYMENT_LABELS[value] ?? value }))}
        />
        <FilterSelect
          label="Experience"
          value={experienceLevel}
          onChange={(value) => setExperienceLevel(value as JobExperienceLevel | "")}
          options={JOB_EXPERIENCE_LEVELS.map((value) => ({ value, label: JOB_EXPERIENCE_LABELS[value] }))}
        />
        <FilterSelect
          label="Workplace"
          value={remoteType}
          onChange={(value) => setRemoteType(value as JobRemoteType | "")}
          options={FILTER_REMOTE.map((value) => ({ value, label: REMOTE_LABELS[value] ?? value }))}
        />
        <FilterSelect
          label="Country"
          value={country}
          onChange={setCountry}
          options={JOB_COUNTRY_FILTERS.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          label="Field"
          value={field}
          onChange={(value) => setField(value as JobField | "")}
          options={JOB_FIELDS.map((value) => ({ value, label: JOB_FIELD_LABELS[value] }))}
        />
        <FilterSelect
          label="Domain"
          value={domain}
          onChange={(value) => setDomain(value as JobDomain | "")}
          options={JOB_DOMAINS.map((value) => ({ value, label: JOB_DOMAIN_LABELS[value] }))}
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setEmploymentType("");
            setExperienceLevel("");
            setRemoteType("");
            setCountry("");
            setField("");
            setDomain("");
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </button>
      )}

      <div className="flex items-center justify-between border-b">
        <div className="flex gap-6">
          <TabButton active={tab === "postings"} onClick={() => setTab("postings")}>
            Job postings
          </TabButton>
          <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
            Saved jobs
          </TabButton>
        </div>
        {data && tab === "postings" && (
          <p className="text-xs text-muted-foreground">{data.pagination.total} roles</p>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading jobs...</p>}
      {isError && <p className="text-sm text-destructive">Could not load jobs. Please try again.</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {tab === "saved" ? "No saved jobs yet. Bookmark a posting to keep it here." : "No jobs match that search."}
        </p>
      )}

      <div className="divide-y">
        {items.map((job) => (
          <JobResultRow
            key={job.id}
            job={job}
            saved={savedIds.includes(job.id)}
            onToggleSaved={() => toggleSaved(job.id)}
          />
        ))}
      </div>

      {tab === "postings" && data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="disabled:opacity-40"
          >
            Previous
          </button>
          <p>
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} roles
          </p>
          <button
            type="button"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function JobResultRow({
  job,
  saved,
  onToggleSaved,
}: {
  job: JobRecord;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const posted = formatPostedAt(job.postedAt);
  const degree = mentionsDegree(job.description);

  return (
    <article className="flex items-start gap-4 py-5">
      <div
        className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${avatarClass(job.company)}`}
      >
        {companyInitials(job.company)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/jobs/${job.id}`} className="text-base font-semibold leading-snug hover:underline">
              {job.title}
            </Link>
            <p className="mt-1 text-sm text-foreground/80">{job.company}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {locationLine(job)} · via {viaLabel(job)}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {posted && <span>{posted}</span>}
              <span>{EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}</span>
              {job.experienceLevel && (
                <span>{JOB_EXPERIENCE_LABELS[job.experienceLevel as JobExperienceLevel] ?? job.experienceLevel}</span>
              )}
              <span>{REMOTE_LABELS[job.remoteType] ?? job.remoteType}</span>
              {degree === false && <span>No degree mentioned</span>}
              {salary && <span>{salary}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ApplyButton href={resolveApplyHref(job)} jobId={job.id} />
            <IconButton label={saved ? "Unsave job" : "Save job"} pressed={saved} onClick={onToggleSaved}>
              <Bookmark className={saved ? "size-4 fill-current" : "size-4"} />
            </IconButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function IconButton({
  label,
  children,
  onClick,
  href,
  pressed,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  pressed?: boolean;
}) {
  const className = `flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${
    pressed ? "text-primary" : ""
  }`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
