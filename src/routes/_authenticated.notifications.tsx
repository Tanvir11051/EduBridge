import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDate } from "@/lib/edubridge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — EduBridge" },
      { name: "description", content: "All your EduBridge alerts about offers, reviews and complaints." },
      { property: "og:title", content: "Notifications — EduBridge" },
      { property: "og:description", content: "Stay on top of offer and review activity." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => markAllAsRead()}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <RowsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="Activity on your offers will show up here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={cn(
                "block w-full rounded-xl border p-4 text-left shadow-sm transition-colors",
                n.is_read ? "border-border bg-card" : "border-info/30 bg-info/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-foreground">{n.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
