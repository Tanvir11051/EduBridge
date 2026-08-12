import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/tutor/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — EduBridge" },
      { name: "description", content: "Complaints you raised or that involve you, with admin resolution status." },
      { property: "og:title", content: "Complaints — EduBridge" },
      { property: "og:description", content: "Track complaint status on EduBridge." },
    ],
  }),
  component: TutorComplaints,
});

function TutorComplaints() {
  const { data, isLoading } = useQuery({
    queryKey: ["tutor-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, title, description, status, admin_note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const complaints = data ?? [];

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Issues involving you. Report from an offer's detail page." />
      {isLoading ? (
        <RowsSkeleton />
      ) : complaints.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No complaints" description="Nothing needs your attention right now." />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
              {c.admin_note && (
                <div className="mt-4 rounded-lg bg-accent/50 p-3 text-sm text-accent-foreground">
                  <span className="font-medium">Admin note: </span>
                  {c.admin_note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
