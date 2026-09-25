import { Link, useParams } from "react-router-dom";
import { ApplyButton, resolveApplyHref } from "@/components/ApplyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useApplication, useApplicationActions } from "@/hooks/useApplications";

function snapshotText(snapshot: Record<string, unknown>, key: string): string {
  const value = snapshot[key];
  return value === null || value === undefined ? "—" : String(value);
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: application, isLoading, isError } = useApplication(id);
  const actions = useApplicationActions(id ?? "");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading application...</p>;
  if (isError || !application) return <p className="text-sm text-destructive">Application not found.</p>;

  const job = application.jobSnapshot;
  const applyHref = resolveApplyHref({
    applicationUrl:
      (typeof job.applicationUrl === "string" && job.applicationUrl) || application.job.applicationUrl || null,
    jobUrl: application.job.jobUrl ?? null,
  });
  const pending = actions.retry.isPending || actions.skip.isPending || actions.markSubmitted.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/applications" className="text-sm text-primary hover:underline">
            ← Applications
          </Link>
          <h1 className="page-title mt-3">{snapshotText(job, "title")}</h1>
          <p className="page-lede mt-2">{snapshotText(job, "company")}</p>
        </div>
        <ApplyButton href={applyHref} jobId={application.job.id} size="default" />
      </div>

      {(application.status === "FAILED" || application.status === "BLOCKED") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{application.status === "FAILED" ? "Application failed" : "Application blocked"}</CardTitle>
            <CardDescription>
              {application.failureReason ?? application.blockedReason ?? "This attempt did not complete. Retry to send it through the pipeline again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" disabled={pending} onClick={() => actions.retry.mutate()}>
              {actions.retry.isPending ? "Retrying..." : "Retry apply"}
            </Button>
          </CardContent>
        </Card>
      )}

      {application.status === "SKIPPED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skipped</CardTitle>
            <CardDescription>
              This application is on hold. Unskip to send it through the apply pipeline again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" disabled={pending} onClick={() => actions.retry.mutate()}>
              {actions.retry.isPending ? "Unskipping..." : "Unskip"}
            </Button>
          </CardContent>
        </Card>
      )}

      {application.status === "MANUAL_REVIEW" && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-base">Manual review</CardTitle>
            <CardDescription>{application.manualReviewReason ?? "This application needs a human decision."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => actions.retry.mutate()}>
              Retry
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => actions.markSubmitted.mutate()}>
              Mark submitted
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => actions.skip.mutate()}>
              Skip
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job snapshot</CardTitle>
          <CardDescription>Captured when the application was created and never updated afterward.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <p>Location: {snapshotText(job, "city")}</p>
          <p>Remote: {snapshotText(job, "remoteType")}</p>
          <p>Salary min: {snapshotText(job, "salaryMin")}</p>
          <p>Salary max: {snapshotText(job, "salaryMax")}</p>
          <p>Match: {application.matchScore} ({application.matchCategory})</p>
          <p>Status: {application.status}</p>
        </CardContent>
      </Card>

      {application.coverLetter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cover letter</CardTitle>
            <CardDescription>
              {application.coverLetter.model} · {application.coverLetter.promptVersion}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{application.coverLetter.content}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {application.answers.length === 0 && <p className="text-sm text-muted-foreground">No questions recorded.</p>}
          {application.answers.map((answer) => (
            <div key={answer.id} className="space-y-1">
              <p className="text-sm font-medium">{answer.questionText}</p>
              <p className="text-xs text-muted-foreground">
                {answer.category} · {answer.status}
                {answer.source ? ` · ${answer.source}` : ""}
              </p>
              <p className="text-sm">{answer.answer ?? answer.blockedReason ?? "—"}</p>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {application.events.map((event) => (
            <p key={event.id} className="text-sm">
              <span className="font-medium">{new Date(event.createdAt).toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">{event.status}</span>
              {event.message ? ` — ${event.message}` : ""}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
