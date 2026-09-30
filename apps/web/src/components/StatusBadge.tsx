import { cn } from "cn";

const APPLICATION_STATUS: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: "Submitted", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  MANUAL_REVIEW: { label: "Needs you", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  FAILED: { label: "Failed", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  SKIPPED: { label: "Skipped", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  BLOCKED: { label: "Blocked", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  PENDING: { label: "Pending", className: "bg-sky-50 text-sky-800 ring-sky-200" },
};

const MATCH_CATEGORY: Record<string, { label: string; className: string }> = {
  EXCELLENT: { label: "Excellent", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  STRONG: { label: "Strong", className: "bg-blue-50 text-blue-800 ring-blue-200" },
  POTENTIAL: { label: "Possible", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  LOW: { label: "Partial", className: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = APPLICATION_STATUS[status] ?? {
    label: status.replaceAll("_", " ").toLowerCase(),
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone.className,
        className,
      )}
    >
      {tone.label}
    </span>
  );
}

export function MatchBadge({
  category,
  score,
  className,
}: {
  category: string;
  score?: number;
  className?: string;
}) {
  const tone = MATCH_CATEGORY[category] ?? {
    label: category,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone.className,
        className,
      )}
    >
      {score != null ? `${score} · ${tone.label}` : tone.label}
    </span>
  );
}
