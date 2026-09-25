import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApplications } from "@/hooks/useApplications";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Manual Review", value: "MANUAL_REVIEW" },
  { label: "Failed", value: "FAILED" },
  { label: "Skipped", value: "SKIPPED" },
  { label: "Blocked", value: "BLOCKED" },
] as const;

export function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const { data, isLoading, isError } = useApplications(status || undefined);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">Every attempt, including blocked and manual-review rows. Nothing is deleted.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === filter.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setParams(filter.value ? { status: filter.value } : {})}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading applications...</p>}
      {isError && <p className="text-sm text-destructive">Could not load applications.</p>}
      {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">No applications in this filter yet.</p>}

      <div className="space-y-3">
        {data?.items.map((application) => (
          <Link key={application.id} to={`/applications/${application.id}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="text-base">{application.job.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{application.job.company}</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{application.job.city ?? application.job.remoteType}</span>
                <span>Match {application.matchScore} ({application.matchCategory})</span>
                <span>{application.status}</span>
                {application.submittedAt && <span>Applied {new Date(application.submittedAt).toLocaleDateString()}</span>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
