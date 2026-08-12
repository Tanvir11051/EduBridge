import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, GraduationCap, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };

const NAV: Record<AppRole, NavItem[]> = {
  student: [
    { label: "Home", to: "/student/dashboard" },
    { label: "Find Tutors", to: "/student/search" },
    { label: "My Offers", to: "/student/offers" },
    { label: "My Reviews", to: "/student/reviews" },
    { label: "Complaints", to: "/student/complaints" },
  ],
  tutor: [
    { label: "Home", to: "/tutor/dashboard" },
    { label: "Availability", to: "/tutor/availability" },
    { label: "Offer Inbox", to: "/tutor/offers" },
    { label: "My Reviews", to: "/tutor/reviews" },
    { label: "Complaints", to: "/tutor/complaints" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Users", to: "/admin/users" },
    { label: "Complaints", to: "/admin/complaints" },
    { label: "All Offers", to: "/admin/offers" },
  ],
};

export function Navbar() {
  const { profile, role } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = role ? NAV[role] : [];
  const profilePath = role === "tutor" ? "/tutor/profile" : role === "student" ? "/student/profile" : "/admin/dashboard";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">EduBridge</span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
              )}
              {notifications.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={cn(
                    "block w-full border-l-2 px-3 py-2 text-left transition-colors hover:bg-accent",
                    n.is_read ? "border-transparent" : "border-info bg-info/5",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                </button>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/notifications">View all notifications</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-ring focus-visible:ring-2" aria-label="Account menu">
                <UserAvatar name={profile?.full_name ?? "User"} path={profile?.avatar_url} className="h-9 w-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate">{profile?.full_name || "Account"}</span>
                <span className="block text-xs font-normal capitalize text-muted-foreground">{role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={profilePath}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="mb-4">Menu</SheetTitle>
              <nav className="flex flex-col gap-1">
                {links.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    activeProps={{ className: "bg-accent text-accent-foreground" }}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
