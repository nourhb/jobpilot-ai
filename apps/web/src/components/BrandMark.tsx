import { cn } from "cn";

function Mark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path
        d="M10 23V9h6.1c2.5 0 4.1 1.4 4.1 3.6 0 1.5-.8 2.6-2.2 3.2 1.6.5 2.6 1.7 2.6 3.4 0 2.4-1.8 3.8-4.8 3.8H10zm2.8-7.8h2.7c1.2 0 1.9-.6 1.9-1.6s-.7-1.5-1.9-1.5h-2.7v3.1zm0 5.9h3.1c1.3 0 2.1-.6 2.1-1.7s-.8-1.7-2.1-1.7h-3.1v3.4z"
        fill={inverted ? "#0f172a" : "white"}
      />
    </svg>
  );
}

export function BrandMark({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Mark className={cn("size-8", inverted ? "text-white" : "text-primary")} inverted={inverted} />
      {!compact && (
        <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-foreground")}>
          JobPilot
        </span>
      )}
    </div>
  );
}
