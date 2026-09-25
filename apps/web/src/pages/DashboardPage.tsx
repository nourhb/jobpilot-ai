import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { useDashboard } from "@/hooks/useDashboard";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError } = useDashboard();

  const cards = [
    { label: "Active Agent", value: data ? data.agentStatus : "—", to: "/agent" },
    { label: "Jobs scanned", value: data?.jobsScanned ?? "—", to: "/jobs" },
    { label: "Matches", value: data?.matching ?? "—", to: "/jobs" },
    { label: "Applications", value: data?.applications ?? "—", to: "/applications" },
    { label: "Manual review", value: data?.manualReview ?? "—", to: "/applications?status=MANUAL_REVIEW" },
    { label: "Rejected", value: data?.rejected ?? "—", to: "/analytics" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{user ? `, ${user.firstName}` : ""}</h1>
        <p className="text-muted-foreground">
          Live counts from your verified profile, matches, and applications. The agent never invents these numbers.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading dashboard...</p>}
      {isError && <p className="text-sm text-destructive">Could not load dashboard.</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-semibold">{card.value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data && !data.autoApplyEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auto-apply is off</CardTitle>
            <CardDescription>
              Start the agent from the Agent page after enabling auto-apply in Preferences. The scheduler will not
              submit anything until both are on.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
