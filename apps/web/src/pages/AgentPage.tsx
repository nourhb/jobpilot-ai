import { Link } from "react-router-dom";
import { AgentStatusDot, statusLabel } from "@/components/AgentStatus";
import { EmptyState, PageSpinner } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgent, useAgentCommand, useAgentLogs } from "@/hooks/useAgent";

export function AgentPage() {
  const { data: agent, isLoading } = useAgent();
  const { data: logs } = useAgentLogs();
  const command = useAgentCommand();

  if (isLoading || !agent) return <PageSpinner label="Loading agent" />;

  const running = agent.agentStatus === "RUNNING";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Autopilot"
        title="Look and apply for me"
        description="JobPilot scans authorized job boards against your confirmed CV, then applies within your daily cap."
      />

      {agent.profileReady === false && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader>
            <CardTitle className="text-base">Confirm your profile first</CardTitle>
            <CardDescription>
              The agent only uses verified skills and experience. Confirm extracted items on{" "}
              <Link to="/profile" className="text-primary underline">
                My profile
              </Link>{" "}
              or upload your resume on{" "}
              <Link to="/resume" className="text-primary underline">
                Resume
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className={running ? "border-emerald-200" : undefined}>
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AgentStatusDot status={agent.agentStatus} />
            {statusLabel(agent.agentStatus)}
          </div>
          <CardTitle className="text-xl">
            {running ? "Agent is looking and applying" : "Agent is idle"}
          </CardTitle>
          <CardDescription>
            Auto-apply {agent.autoApplyEnabled ? "on" : "off"} · applies at score {agent.minimumMatchScore}+ ·{" "}
            {agent.maxApplicationsPerHour}/hour · {agent.maxApplicationsPerDay}/day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Min score" value={`${agent.minimumMatchScore}+`} />
            <Metric label="Hourly cap" value={String(agent.maxApplicationsPerHour)} />
            <Metric label="Daily cap" value={String(agent.maxApplicationsPerDay)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Where the employer has an apply API (Lever, Ashby, sample jobs), the agent submits. Greenhouse and public
            feeds have no submit API, so it prepares the cover letter and answers, then leaves a company apply link for
            you to finish.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={command.isPending || running} onClick={() => command.mutate("start")}>
              {command.isPending && !running ? "Starting..." : running ? "Running" : "Start looking and applying"}
            </Button>
            <Button variant="outline" disabled={command.isPending || !running} onClick={() => command.mutate("pause")}>
              Pause
            </Button>
            <Button
              variant="outline"
              disabled={command.isPending || agent.agentStatus === "STOPPED"}
              onClick={() => command.mutate("stop")}
            >
              Stop
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Change the score cutoff, caps, and locations in{" "}
            <Link to="/preferences" className="text-primary underline">
              Preferences
            </Link>
            . Watch results on{" "}
            <Link to="/applications" className="text-primary underline">
              Applications
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What it uses</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p>
            <span className="block text-xs text-muted-foreground">Cover letters</span>
            {agent.autoCoverLetterEnabled ? "On" : "Off"}
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Question answering</span>
            {agent.autoQuestionAnswerEnabled ? "On" : "Off"}
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Sources</span>
            {agent.allowedSourceTypes.length === 0 ? "All enabled boards" : agent.allowedSourceTypes.join(", ")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Applications the agent prepared or submitted for this account.</CardDescription>
        </CardHeader>
        <CardContent>
          {(!logs || logs.length === 0) && (
            <EmptyState title="No applications yet" description="Start the agent to begin looking and applying." />
          )}
          {logs && logs.length > 0 && (
            <ol className="space-y-0 border-l border-border pl-4">
              {logs.map((log) => (
                <li key={`${log.applicationId}-${log.at}`} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">{new Date(log.at).toLocaleString()}</p>
                  <p className="mt-0.5 text-sm">
                    <span className="font-medium">
                      {log.company} / {log.title}
                    </span>
                    <span className="text-muted-foreground"> — {log.message}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
