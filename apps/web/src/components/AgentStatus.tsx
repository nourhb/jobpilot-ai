import { cn } from "cn";

export function agentTone(status: string | undefined) {
  if (status === "RUNNING") return "bg-emerald-500";
  if (status === "PAUSED") return "bg-amber-500";
  if (status === "ERROR") return "bg-rose-500";
  return "bg-slate-400";
}

export function statusLabel(status: string | undefined) {
  if (status === "RUNNING") return "Running";
  if (status === "PAUSED") return "Paused";
  if (status === "ERROR") return "Error";
  return "Stopped";
}

export function AgentStatusDot({
  status,
  className,
}: {
  status: string | undefined;
  className?: string;
}) {
  return (
    <span className={cn("relative flex size-2", className)}>
      {status === "RUNNING" && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", agentTone(status))} />
    </span>
  );
}

export function AgentStatusPill({ status }: { status: string | undefined }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <AgentStatusDot status={status} />
      Agent {statusLabel(status).toLowerCase()}
    </span>
  );
}
