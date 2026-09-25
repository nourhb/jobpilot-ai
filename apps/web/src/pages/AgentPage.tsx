import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAgent, useAgentCommand, useAgentLogs } from "@/hooks/useAgent";

export function AgentPage() {
  const { data: agent, isLoading } = useAgent();
  const { data: logs } = useAgentLogs();
  const command = useAgentCommand();

  if (isLoading || !agent) return <p className="text-sm text-muted-foreground">Loading agent...</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Runtime"
        title="Job search agent"
        description="Start, pause, and stop only change runtime status. Caps and auto-apply live in Preferences."
      />
      <p className="-mt-4 text-sm text-muted-foreground">
        Configure thresholds in{" "}
        <Link to="/preferences" className="text-primary underline">
          Preferences
        </Link>
        .
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Status: {agent.agentStatus}</CardTitle>
          <CardDescription>
            Auto-apply {agent.autoApplyEnabled ? "enabled" : "disabled"} · min score {agent.minimumMatchScore} ·{" "}
            {agent.maxApplicationsPerDay}/day · {agent.maxApplicationsPerHour}/hour
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button disabled={command.isPending} onClick={() => command.mutate("start")}>
            Start agent
          </Button>
          <Button variant="outline" disabled={command.isPending} onClick={() => command.mutate("pause")}>
            Pause agent
          </Button>
          <Button variant="outline" disabled={command.isPending} onClick={() => command.mutate("stop")}>
            Stop agent
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Cover letters: {agent.autoCoverLetterEnabled ? "on" : "off"}</p>
          <p>Question answering: {agent.autoQuestionAnswerEnabled ? "on" : "off"}</p>
          <p>
            Allowed sources: {agent.allowedSourceTypes.length === 0 ? "all enabled sources" : agent.allowedSourceTypes.join(", ")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent logs</CardTitle>
          <CardDescription>Recent application events for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!logs || logs.length === 0) && <p className="text-sm text-muted-foreground">No agent activity yet.</p>}
          {logs?.map((log) => (
            <p key={`${log.applicationId}-${log.at}`} className="text-sm">
              <span className="font-medium">{new Date(log.at).toLocaleString()}</span> {log.company} / {log.title}: {log.message}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
