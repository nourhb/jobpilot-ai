import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { PageHeader } from "@/components/PageHeader";
import { useJob, useJobMatch } from "@/hooks/useJobs";
import type { JobMatchRecord } from "@/services/jobsService";

const MATCH_CATEGORY_STYLES: Record<string, string> = {
  EXCELLENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  STRONG: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  POTENTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  LOW: "bg-muted text-muted-foreground",
};

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MatchResult({
  match,
  applyHref,
  jobId,
}: {
  match: JobMatchRecord;
  applyHref: string | null;
  jobId: string;
}) {
  if (match.skippedReason) {
    const needsAuthorization = /work authorization/i.test(match.skippedReason);
    return (
      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle className="text-base">Not a match yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{match.skippedReason}</p>
          <ApplyButton href={applyHref} jobId={jobId} />
          {needsAuthorization && (
            <p className="text-sm text-muted-foreground">
              Matching will not invent your legal status. Set it on{" "}
              <Link to="/profile" className="font-medium text-primary underline">
                My Profile
              </Link>{" "}
              or upload a resume that states it (for example “Canadian citizen” or “Open work permit”) on{" "}
              <Link to="/resume" className="font-medium text-primary underline">
                Resume
              </Link>
              , then confirm the extracted items.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Match score</CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${MATCH_CATEGORY_STYLES[match.matchCategory] ?? ""}`}
          >
            {match.score} — {match.matchCategory}
          </span>
          <ApplyButton href={applyHref} jobId={jobId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <ScoreRow label="Skills (30%)" value={match.skillsScore} />
          <ScoreRow label="Experience (20%)" value={match.experienceScore} />
          <ScoreRow label="Title similarity (15%)" value={match.titleScore} />
          <ScoreRow label="Location (10%)" value={match.locationScore} />
          <ScoreRow label="Authorization (10%)" value={match.authorizationScore} />
          <ScoreRow label="Salary (5%)" value={match.salaryScore} />
          <ScoreRow label="Employment type (5%)" value={match.employmentTypeScore} />
          <ScoreRow label="Preferences (5%)" value={match.preferencesScore} />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            System decision: <span className="font-medium">{match.decision}</span>
            {match.aiSuggestedDecision && (
              <span className="text-muted-foreground"> (AI suggested: {match.aiSuggestedDecision})</span>
            )}
          </p>
          <ApplyButton href={applyHref} jobId={jobId} />
        </div>

        {match.reasons.length > 0 && (
          <div>
            <p className="text-sm font-medium">Why this fits</p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              {match.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        {match.missingRequirements.length > 0 && (
          <div>
            <p className="text-sm font-medium">Possibly missing</p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              {match.missingRequirements.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        {match.riskFlags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Risk flags</p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              {match.riskFlags.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        <ApplyButton href={applyHref} jobId={jobId} size="default" />
      </CardContent>
    </Card>
  );
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IGNORE_EMAIL = /noreply|no-reply|donotreply|example\.com|sentry\.|wixpress|cloudfront|\.(png|jpg|gif|svg)$/i;

function extractApplyEmails(text: string): string[] {
  const decoded = text.includes("&lt;") || text.includes("&amp;")
    ? text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    : text;
  const found = decoded.match(EMAIL_RE) ?? [];
  return [...new Set(found.map((email) => email.toLowerCase()).filter((email) => !IGNORE_EMAIL.test(email)))];
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min === null && max === null) return null;
  const range = min !== null && max !== null ? `${min.toLocaleString()}–${max.toLocaleString()}` : (min ?? max)!.toLocaleString();
  return `${currency ?? "CAD"} ${range}`;
}

function readableDescription(html: string): string {
  let text = html;
  if (text.includes("&lt;")) {
    text = text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
  return text
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: match, refetch, isFetching, isFetched } = useJobMatch(id);

  if (isLoading || !job) {
    return <p className="text-sm text-muted-foreground">Loading job...</p>;
  }

  const emails = extractApplyEmails(`${job.description}\n${job.descriptionHtml ?? ""}`);
  const applyHref = resolveApplyHref({ ...job, emails });
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const location = [job.city, job.province, job.country].filter(Boolean).join(", ") || job.locationRaw;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={job.title}
        description={[job.company, job.city, job.province].filter(Boolean).join(" · ")}
        action={<ApplyButton href={applyHref} jobId={job.id} size="default" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to apply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Company</span>
            <span className="ml-2 font-medium">{job.company}</span>
          </p>
          {location && (
            <p>
              <span className="text-muted-foreground">Location</span>
              <span className="ml-2">{location}</span>
            </p>
          )}
          {salary && (
            <p>
              <span className="text-muted-foreground">Salary</span>
              <span className="ml-2">{salary}</span>
            </p>
          )}
          {job.experienceLevel && (
            <p>
              <span className="text-muted-foreground">Experience</span>
              <span className="ml-2">{job.experienceLevel}</span>
            </p>
          )}
          {applyHref ? (
            <p>
              <span className="text-muted-foreground">Company apply page</span>{" "}
              <a href={applyHref} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                {applyHref}
              </a>
            </p>
          ) : (
            <p className="text-muted-foreground">
              This listing has no company apply link. Apply here in the app.
            </p>
          )}
          {emails.length > 0 ? (
            <div>
              <p className="text-muted-foreground">Emails listed in this posting</p>
              <ul className="mt-1 space-y-1">
                {emails.map((email) => (
                  <li key={email}>
                    <a className="text-primary hover:underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No apply email was published in this posting. Use the company application form.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <ApplyButton
              href={applyHref}
              jobId={job.id}
              size="default"
              label={emails.length > 0 && !job.applicationUrl && !job.jobUrl ? "Email to apply" : "Apply"}
            />
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Computing match..." : isFetched ? "Recompute match" : "Check my match"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="whitespace-pre-wrap pt-6 text-sm leading-6 text-foreground/90">
          {readableDescription(job.descriptionHtml || job.description)}
        </CardContent>
      </Card>

      {match && <MatchResult match={match} applyHref={applyHref} jobId={job.id} />}
    </div>
  );
}
