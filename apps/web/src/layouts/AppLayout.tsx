import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useAuth";
import { useAgent } from "@/hooks/useAgent";
import { useNotificationActions, useNotifications } from "@/hooks/useNotifications";

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
  const navigate = useNavigate();
  const { data: agent } = useAgent();
  const { data: notifications } = useNotifications();
  const notificationActions = useNotificationActions();
  const unread = notifications?.unreadCount ?? 0;

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
            Agent: {agent?.agentStatus ?? "STOPPED"}
          </span>
          <div className="flex items-center gap-3">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Notifications{unread > 0 ? ` (${unread})` : ""}
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border bg-card p-3 shadow">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Recent</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => notificationActions.markAllRead.mutate()}
                  >
                    Mark all read
                  </button>
                </div>
                {(!notifications || notifications.items.length === 0) && (
                  <p className="text-xs text-muted-foreground">No notifications.</p>
                )}
                <ul className="max-h-64 space-y-2 overflow-auto">
                  {notifications?.items.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full text-left text-xs ${item.read ? "text-muted-foreground" : "font-medium"}`}
                        onClick={() => {
                          if (!item.read) notificationActions.markRead.mutate(item.id);
                          if (item.entityType === "Application" && item.entityId) {
                            navigate(`/applications/${item.entityId}`);
                          }
                        }}
                      >
                        {item.title}
                        <span className="mt-0.5 block font-normal text-muted-foreground">{item.body}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
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
