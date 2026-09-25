import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  Briefcase,
  FileText,
  FileUp,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/useAuth";
import { useAgent } from "@/hooks/useAgent";
import { useNotificationActions, useNotifications } from "@/hooks/useNotifications";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/matches", label: "For you", icon: Sparkles },
      { to: "/jobs", label: "Find jobs", icon: Briefcase },
      { to: "/applications", label: "Applications", icon: FileText },
      { to: "/agent", label: "Agent", icon: Bot },
    ],
  },
  {
    label: "Profile",
    items: [
      { to: "/profile", label: "My profile", icon: User },
      { to: "/resume", label: "Resume", icon: FileUp },
      { to: "/preferences", label: "Preferences", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function agentTone(status: string | undefined) {
  if (status === "RUNNING") return "bg-emerald-600";
  if (status === "PAUSED") return "bg-amber-500";
  if (status === "ERROR") return "bg-rose-600";
  return "bg-slate-400";
}

function statusLabel(status: string | undefined) {
  if (status === "RUNNING") return "Running";
  if (status === "PAUSED") return "Paused";
  if (status === "ERROR") return "Error";
  return "Stopped";
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: agent } = useAgent();
  const { data: notifications } = useNotifications();
  const notificationActions = useNotificationActions();
  const unread = notifications?.unreadCount ?? 0;
  const status = agent?.agentStatus ?? "STOPPED";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card px-3 py-5 lg:flex">
        <BrandMark className="px-2" />
        <nav className="mt-8 flex-1 space-y-6 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                          isActive && "bg-muted font-medium text-foreground",
                        )
                      }
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="rounded-md border px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Agent</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            <span className={cn("size-2 rounded-full", agentTone(status))} />
            {statusLabel(status)}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <span className={cn("size-1.5 rounded-full", agentTone(status))} />
            Agent {statusLabel(status).toLowerCase()}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm">
                Inbox{unread > 0 ? ` (${unread})` : ""}
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-card p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Notifications</span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => notificationActions.markAllRead.mutate()}
                  >
                    Mark all read
                  </button>
                </div>
                {(!notifications || notifications.items.length === 0) && (
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                )}
                <ul className="max-h-64 space-y-1 overflow-auto">
                  {notifications?.items.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${item.read ? "text-muted-foreground" : "font-medium"}`}
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
            {user && (
              <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
            )}
            <Button variant="outline" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 lg:hidden">
          {NAV_GROUPS.flatMap((group) => [...group.items]).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-md px-3 py-1 text-sm text-muted-foreground",
                  isActive && "bg-muted font-medium text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
