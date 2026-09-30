import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  FileText,
  FileUp,
  LayoutDashboard,
  LogOut,
  Settings,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "cn";
import { AgentStatusDot, AgentStatusPill, statusLabel } from "@/components/AgentStatus";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/useAgent";
import { useLogout } from "@/hooks/useAuth";
import { useNotificationActions, useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/stores/authStore";

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

function initials(firstName?: string, lastName?: string, email?: string) {
  const fromName = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  if (fromName) return fromName;
  return (email?.[0] ?? "U").toUpperCase();
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const inboxRef = useRef<HTMLDetailsElement>(null);
  const { data: agent } = useAgent();
  const { data: notifications } = useNotifications();
  const notificationActions = useNotificationActions();
  const unread = notifications?.unreadCount ?? 0;
  const status = agent?.agentStatus ?? "STOPPED";

  useEffect(() => {
    if (inboxRef.current) inboxRef.current.open = false;
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar px-3 py-5 text-sidebar-foreground md:flex">
        <BrandMark inverted className="px-2" />
        <nav className="mt-8 flex-1 space-y-6 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          isActive && "bg-sidebar-accent font-medium text-white",
                        )
                      }
                    >
                      <Icon className="size-4 opacity-80" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-sidebar-muted">Agent</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white">
            <AgentStatusDot status={status} />
            {statusLabel(status)}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden md:block">
            <AgentStatusPill status={status} />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <details ref={inboxRef} className="relative">
              <summary className="flex cursor-pointer list-none items-center">
                <span className="relative inline-flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Bell className="size-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-card p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Inbox</span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => notificationActions.markAllRead.mutate()}
                  >
                    Mark all read
                  </button>
                </div>
                {(!notifications || notifications.items.length === 0) && (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
                )}
                <ul className="max-h-72 space-y-1 overflow-auto">
                  {notifications?.items.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-muted ${item.read ? "text-muted-foreground" : "font-medium"}`}
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
              <div className="hidden items-center gap-2 sm:flex">
                <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.firstName, user.lastName, user.email)}
                </span>
                <span className="max-w-[12rem] truncate text-sm text-muted-foreground">{user.email}</span>
              </div>
            )}
            <Button variant="outline" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
              <LogOut className="size-3.5" />
              Log out
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
          {NAV_GROUPS.flatMap((group) => [...group.items]).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-full px-3 py-1 text-sm text-muted-foreground",
                  isActive && "bg-primary/10 font-medium text-primary",
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
