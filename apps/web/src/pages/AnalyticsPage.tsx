import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/useDashboard";

export function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalytics();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics...</p>;
  if (isError || !data) return <p className="text-sm text-destructive">Could not load analytics.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Counts only — no AI-generated metrics.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications by status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.keys(data.applicationsByStatus).length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
          {Object.entries(data.applicationsByStatus).map(([status, count]) => (
            <p key={status}>
              {status}: <span className="font-medium">{count}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matches by decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {Object.keys(data.matchesByDecision).length === 0 && <p className="text-muted-foreground">No matches yet.</p>}
          {Object.entries(data.matchesByDecision).map(([decision, count]) => (
            <p key={decision}>
              {decision}: <span className="font-medium">{count}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications last 7 days</CardTitle>
          <CardDescription>Created rows, including blocked and manual-review attempts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {data.applicationsLast7Days.map((row) => (
            <p key={row.date}>
              {row.date}: <span className="font-medium">{row.count}</span>
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
