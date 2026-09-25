import { Button } from "@/components/ui/button";

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
  size = "sm",
  label = "Apply",
}: {
  href: string | null | undefined;
  size?: ButtonSize;
  label?: string;
}) {
  if (href) {
    return (
      <Button asChild size={size}>
        <a href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      </Button>
    );
  }

  return (
    <Button size={size} disabled title="This posting has no application link">
      {label}
    </Button>
  );
}
