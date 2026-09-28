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

  const running = agent.agentStatus === "RUNNING";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Agent"
        title="Look and apply for me"
        description="JobPilot scans authorized job boards against your confirmed CV, then applies within your daily cap."
      />

      {agent.profileReady === false && (
        <Card className="border-amber-300">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{running ? "Agent is looking and applying" : `Status: ${agent.agentStatus}`}</CardTitle>
          <CardDescription>
            Auto-apply {agent.autoApplyEnabled ? "on" : "off"} · applies at score {agent.minimumMatchScore}+ ·{" "}
            {agent.maxApplicationsPerHour}/hour · {agent.maxApplicationsPerDay}/day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button variant="outline" disabled={command.isPending || agent.agentStatus === "STOPPED"} onClick={() => command.mutate("stop")}>
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
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Cover letters: {agent.autoCoverLetterEnabled ? "on" : "off"}</p>
          <p>Question answering: {agent.autoQuestionAnswerEnabled ? "on" : "off"}</p>
          <p>
            Sources: {agent.allowedSourceTypes.length === 0 ? "all enabled boards" : agent.allowedSourceTypes.join(", ")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Applications the agent prepared or submitted for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!logs || logs.length === 0) && (
            <p className="text-sm text-muted-foreground">No applications yet. Start the agent to begin.</p>
          )}
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
