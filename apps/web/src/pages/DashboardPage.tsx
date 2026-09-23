import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";

const PLACEHOLDER_CARDS = [
  { label: "Active Agent", value: "Not configured" },
  { label: "Jobs Today", value: "—" },
  { label: "Matches", value: "—" },
  { label: "Applications", value: "—" },
  { label: "Interviews", value: "—" },
] as const;

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          This is the Phase 1 foundation. Job discovery, matching, cover letters and the autonomous
          agent are implemented in upcoming phases.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {PLACEHOLDER_CARDS.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-semibold">{card.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's implemented so far</CardTitle>
          <CardDescription>Phase 1 — Foundation</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Monorepo (pnpm workspaces): apps/web, apps/api, packages/shared, packages/ai, packages/source-adapters</li>
            <li>Authentication: register, login, logout, session (Argon2 + JWT/httpOnly cookie)</li>
            <li>PostgreSQL + Prisma (User, AuditLog)</li>
            <li>Docker Compose (web, api, worker, postgres, redis)</li>
            <li>AI provider abstraction + MockProvider (no real key configured yet)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
