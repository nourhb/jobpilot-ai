import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-lede">{description}</p>}
      </div>
      {action}
    </div>
  );
}
