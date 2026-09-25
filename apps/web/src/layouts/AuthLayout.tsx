import { Outlet } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1fr]">
      <section className="hidden flex-col justify-between bg-slate-900 px-12 py-12 text-slate-100 lg:flex">
        <BrandMark inverted />
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Job search with a verified profile.
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Roles come from public career boards. Matches use only facts you have confirmed. The agent does not invent experience, authorization, or skills.
          </p>
        </div>
        <p className="text-xs text-slate-400">JobPilot · public boards only · no invented credentials</p>
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
