import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useJobs } from "@/hooks/useJobs";

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) => n.toLocaleString();
  const range = min !== null && max !== null ? `${fmt(min)}–${fmt(max)}` : fmt((min ?? max)!);
  return `${currency ?? ""} ${range}`.trim();
}

const REMOTE_TYPE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "Onsite",
  UNKNOWN: "Location unknown",
};

export function JobsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useJobs({ search: search || undefined });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find Jobs</h1>
        <p className="text-muted-foreground">
          Jobs discovered from connected sources (section 20). Open a job to compute your personalized match score.
        </p>
      </div>

      <Input
        placeholder="Search by title or company..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading jobs...</p>}
      {isError && <p className="text-sm text-destructive">Could not load jobs. Please try again.</p>}
      {!isLoading && data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">No jobs found yet. Job discovery runs on a schedule (Phase 8).</p>
      )}

      <div className="space-y-3">
        {data?.items.map((job) => {
          const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
          return (
            <Link key={job.id} to={`/jobs/${job.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{REMOTE_TYPE_LABELS[job.remoteType] ?? job.remoteType}</span>
                  {job.city && <span>{job.city}{job.province ? `, ${job.province}` : ""}</span>}
                  {salary && <span>{salary}</span>}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <p className="text-xs text-muted-foreground">
          Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} jobs)
        </p>
      )}
    </div>
  );
}
