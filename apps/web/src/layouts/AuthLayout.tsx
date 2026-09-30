import { Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(224_72%_38%_/_0.28),transparent_42%)]" />
        <BrandMark inverted />
        <div className="relative max-w-md space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">Job search, verified</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Apply from facts on your CV, not invented ones.
          </h1>
          <p className="text-sm leading-6 text-sidebar-muted">
            Roles come from public career boards. Matches use only skills and experience you have confirmed. The agent
            does not invent authorization, titles, or work history.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">Public boards only · no invented credentials</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <Outlet />
        </div>
      </section>
    </div>
  );
}
