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

  if (href) {
    return (
      <Button asChild size={size}>
        <a href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      </Button>
    );
  }

  if (jobId) {
    return (
      <Button
        size={size}
        disabled={apply.isPending}
        onClick={() => apply.mutate(jobId)}
        title="Start an application from your verified profile"
      >
        {apply.isPending ? "Applying..." : apply.isError ? "Retry apply" : label}
      </Button>
    );
  }

  return (
    <Button size={size} disabled title="This posting has no application link">
      {label}
    </Button>
  );
}
