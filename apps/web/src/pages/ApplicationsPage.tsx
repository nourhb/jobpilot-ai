import { Link, useSearchParams } from "react-router-dom";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title="Applications"
        description="Every attempt, including blocked and manual-review rows. Nothing is deleted."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              status === filter.value ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
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
          <Card key={application.id} className="hover:bg-muted/40">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg font-semibold">
                  <Link to={`/applications/${application.id}`} className="hover:underline">
                    {application.job.title}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{application.job.company}</p>
              </div>
              <ApplyButton href={resolveApplyHref(application.job)} />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{application.job.city ?? application.job.remoteType}</span>
              <span>Match {application.matchScore} ({application.matchCategory})</span>
              <span>{application.status}</span>
              {application.submittedAt && <span>Applied {new Date(application.submittedAt).toLocaleDateString()}</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
