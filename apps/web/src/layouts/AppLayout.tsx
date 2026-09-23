import { NavLink, Outlet } from "react-router-dom";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/jobs", label: "Find Jobs" },
  { to: "/applications", label: "Applications" },
  { to: "/agent", label: "Agent" },
  { to: "/profile", label: "My Profile" },
  { to: "/resume", label: "Resume" },
  { to: "/preferences", label: "Preferences" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-6 py-5">
          <span className="text-lg font-semibold">JobPilot AI</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Agent: NOT CONFIGURED
          </span>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Log out
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
