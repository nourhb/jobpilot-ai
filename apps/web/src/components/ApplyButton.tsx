import { Button } from "@/components/ui/button";
import { useApplyToJob } from "@/hooks/useApplications";

type ButtonSize = "sm" | "default";

export function resolveApplyHref(job: {
  applicationUrl?: string | null;
  jobUrl?: string | null;
  emails?: string[];
}): string | null {
  if (job.applicationUrl) return job.applicationUrl;
  if (job.jobUrl) return job.jobUrl;
  if (job.emails?.[0]) return `mailto:${job.emails[0]}`;
  return null;
}

export function ApplyButton({
  href,
  jobId,
  size = "sm",
  label = "Apply",
}: {
  href?: string | null;
  jobId?: string;
  size?: ButtonSize;
  label?: string;
}) {
  const apply = useApplyToJob();
  const canApply = Boolean(href || jobId);

  function handleClick() {
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    if (jobId) {
      apply.mutate(jobId);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size={size} disabled={!canApply || apply.isPending} onClick={handleClick}>
        {apply.isPending ? "Applying..." : apply.isError ? "Retry apply" : label}
      </Button>
      {apply.isError && (
        <p className="max-w-56 text-right text-xs text-destructive">
          {apply.error instanceof Error ? apply.error.message : "Apply failed. Try again."}
        </p>
      )}
    </div>
  );
}
