import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">JobPilot AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Autonomous Canadian job discovery &amp; application preparation.
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
