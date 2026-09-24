import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

function MatchResult({ match }: { match: JobMatchRecord }) {
  if (match.skippedReason) {
    return (
      <Card className="border-amber-300">
        <CardHeader>
          <CardTitle className="text-base">Not a match</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{match.skippedReason}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Match score</CardTitle>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${MATCH_CATEGORY_STYLES[match.matchCategory] ?? ""}`}
        >
          {match.score} — {match.matchCategory}
        </span>
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

        <p className="text-sm">
          System decision: <span className="font-medium">{match.decision}</span>
          {match.aiSuggestedDecision && (
            <span className="text-muted-foreground"> (AI suggested: {match.aiSuggestedDecision})</span>
          )}
        </p>

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
      </CardContent>
    </Card>
  );
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { data: match, refetch, isFetching, isFetched } = useJobMatch(id);

  if (isLoading || !job) {
    return <p className="text-sm text-muted-foreground">Loading job...</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
        <p className="text-muted-foreground">
          {job.company}
          {job.city ? ` · ${job.city}${job.province ? `, ${job.province}` : ""}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="whitespace-pre-wrap pt-6 text-sm">{job.description}</CardContent>
      </Card>

      <div>
        <Button onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Computing match..." : isFetched ? "Recompute match" : "Check my match"}
        </Button>
      </div>

      {match && <MatchResult match={match} />}
    </div>
  );
}
