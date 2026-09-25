import { useState } from "react";
import { Link } from "react-router-dom";
import { JOB_EXPERIENCE_LABELS, type JobExperienceLevel } from "@jobpilot/shared";
import { Bookmark } from "lucide-react";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { PageHeader } from "@/components/PageHeader";
import { useRecommendedJobs } from "@/hooks/useJobs";
import type { JobMatchListItem, JobRecord } from "@/services/jobsService";

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

const SOURCE_LABELS: Record<string, string> = {
  MOCK: "JobPilot",
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  ASHBY: "Ashby",
  WORKABLE: "Workable",
  COMPANY: "Public feed",
};

const CATEGORY_LABELS: Record<string, string> = {
  EXCELLENT: "Excellent match",
  STRONG: "Strong match",
  POTENTIAL: "Possible match",
  LOW: "Partial match",
};

const AVATAR_COLORS = [
  "bg-slate-100 text-slate-700",
  "bg-blue-50 text-blue-800",
  "bg-indigo-50 text-indigo-800",
  "bg-stone-100 text-stone-700",
  "bg-sky-50 text-sky-800",
  "bg-zinc-100 text-zinc-700",
];

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

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-800";
  if (score >= 70) return "bg-blue-50 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

export function MatchesPage() {
  const { data, isLoading, isError } = useRecommendedJobs();
  const [savedIds, setSavedIds] = useState<string[]>(readSavedIds);

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="For you"
        description="Jobs picked from your confirmed CV — skills and past titles only. Confirm items on your profile if this list is empty."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Matching jobs to your CV...</p>}
      {isError && <p className="text-sm text-destructive">Could not load matches. Please try again.</p>}

      {data && !data.profileReady && (
        <div className="rounded-md border bg-card px-5 py-8">
          <p className="text-sm font-medium">Confirm your CV first</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a resume and confirm at least one skill or work history item. Matching only uses verified
            profile data, not the raw file.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/resume" className="text-primary hover:underline">
              Upload resume
            </Link>
            <Link to="/profile" className="text-primary hover:underline">
              Confirm profile
            </Link>
          </div>
        </div>
      )}

      {data?.profileReady && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No listings in the current catalog match your confirmed skills or titles. Add more confirmed
          skills on your profile, or browse Find jobs.
        </p>
      )}

      {data?.profileReady && data.items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {data.items.length} roles ranked from {data.scanned} postings that mention your CV.
        </p>
      )}

      <div className="divide-y">
        {data?.items.map((item) => (
          <MatchRow
            key={item.job.id}
            item={item}
            saved={savedIds.includes(item.job.id)}
            onToggleSaved={() => toggleSaved(item.job.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchRow({
  item,
  saved,
  onToggleSaved,
}: {
  item: JobMatchListItem;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const { job } = item;
  const posted = formatPostedAt(job.postedAt);
  const applyHref = resolveApplyHref(job);

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
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/jobs/${job.id}`} className="text-base font-semibold leading-snug hover:underline">
                {job.title}
              </Link>
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${scoreTone(item.score)}`}>
                {item.score} · {CATEGORY_LABELS[item.matchCategory] ?? item.matchCategory}
              </span>
            </div>
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
            </p>
            {item.matchedSkills.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                From your CV: {item.matchedSkills.slice(0, 6).join(", ")}
                {item.matchedSkills.length > 6 ? "…" : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ApplyButton href={applyHref} />
            <button
              type="button"
              aria-label={saved ? "Unsave job" : "Save job"}
              aria-pressed={saved}
              onClick={onToggleSaved}
              className={`flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${
                saved ? "text-primary" : ""
              }`}
            >
              <Bookmark className={saved ? "size-4 fill-current" : "size-4"} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
