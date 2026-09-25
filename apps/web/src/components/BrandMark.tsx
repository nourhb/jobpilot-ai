import { cn } from "cn";

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
      <span
        className={cn(
          "grid size-8 place-items-center rounded-md text-sm font-semibold",
          inverted ? "bg-white text-slate-900" : "bg-primary text-primary-foreground",
        )}
      >
        J
      </span>
      {!compact && (
        <span className={cn("text-[15px] font-semibold tracking-tight", inverted && "text-white")}>
          JobPilot
        </span>
      )}
    </div>
  );
}
