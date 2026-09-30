import type { ReactNode } from "react";
import { EmptyState, PageSpinner } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/useDashboard";

export function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalytics();

  if (isLoading) return <PageSpinner label="Loading analytics" />;
  if (isError || !data) return <p className="text-sm text-destructive">Could not load analytics.</p>;

  const statusMax = Math.max(1, ...Object.values(data.applicationsByStatus));
  const decisionMax = Math.max(1, ...Object.values(data.matchesByDecision));
  const dayMax = Math.max(1, ...data.applicationsLast7Days.map((row) => row.count));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Signal" title="Analytics" description="Counts only — no AI-generated metrics." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications by status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(data.applicationsByStatus).length === 0 && (
            <EmptyState title="No applications yet" description="Counts appear here after the first apply." />
          )}
          {Object.entries(data.applicationsByStatus).map(([status, count]) => (
            <BarRow key={status} label={<StatusBadge status={status} />} value={count} max={statusMax} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matches by decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(data.matchesByDecision).length === 0 && (
            <p className="text-sm text-muted-foreground">No matches yet.</p>
          )}
          {Object.entries(data.matchesByDecision).map(([decision, count]) => (
            <BarRow key={decision} label={decision} value={count} max={decisionMax} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications last 7 days</CardTitle>
          <CardDescription>Created rows, including blocked and manual-review attempts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.applicationsLast7Days.map((row) => (
            <BarRow key={row.date} label={row.date} value={row.count} max={dayMax} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string | ReactNode;
  value: number;
  max: number;
}) {
  const width = Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-mono text-xs tabular-nums">{value}</span>
    </div>
  );
}
