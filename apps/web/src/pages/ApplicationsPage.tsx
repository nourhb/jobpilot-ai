import { Link, useSearchParams } from "react-router-dom";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { EmptyState, PageSpinner } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { MatchBadge, StatusBadge } from "@/components/StatusBadge";
import { useApplications } from "@/hooks/useApplications";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Needs you", value: "MANUAL_REVIEW" },
  { label: "Failed", value: "FAILED" },
  { label: "Skipped", value: "SKIPPED" },
  { label: "Blocked", value: "BLOCKED" },
] as const;

function locationLine(job: { city: string | null; remoteType: string }) {
  return job.city || job.remoteType.replaceAll("_", " ").toLowerCase();
}

export function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const { data, isLoading, isError } = useApplications(status || undefined);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Pipeline"
        title="Applications"
        description="Every attempt, including blocked and manual-review rows. Nothing is deleted."
      />

      <div className="flex flex-wrap gap-1.5 rounded-xl border bg-card p-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              status === filter.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setParams(filter.value ? { status: filter.value } : {})}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && <PageSpinner label="Loading applications" />}
      {isError && <p className="text-sm text-destructive">Could not load applications.</p>}
      {data && data.items.length === 0 && (
        <EmptyState
          title="No applications in this filter"
          description="When the agent applies, each attempt lands here — submitted, needs you, or failed."
        />
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {data.items.map((application) => (
            <article
              key={application.id}
              className="surface-row flex items-start justify-between gap-4 border-b px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <Link to={`/applications/${application.id}`} className="text-sm font-semibold hover:underline">
                  {application.job.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {application.job.company}
                  <span className="mx-1.5 text-border">·</span>
                  {locationLine(application.job)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={application.status} />
                  <MatchBadge category={application.matchCategory} score={application.matchScore} />
                  {application.submittedAt && (
                    <span className="text-xs text-muted-foreground">
                      Applied {new Date(application.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <ApplyButton href={resolveApplyHref(application.job)} jobId={application.job.id} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
