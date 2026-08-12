import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/complaints")({
  head: () => ({
    meta: [
      { title: "My complaints — EduBridge" },
      { name: "description", content: "Track complaints you raised and their admin resolution status." },
      { property: "og:title", content: "My complaints — EduBridge" },
      { property: "og:description", content: "Complaint status and admin notes on EduBridge." },
    ],
  }),
  component: StudentComplaints,
});

export type ComplaintRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  raised_by: string;
  against: string | null;
};

function StudentComplaints() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, title, description, status, admin_note, created_at, raised_by, against")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ComplaintRow[];
    },
  });

  const complaints = data ?? [];

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle="Issues you raised or that were raised about you. Report from an offer's detail page."
      />
      {isLoading ? (
        <RowsSkeleton />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No complaints"
          description="You can report an issue from any offer's detail page."
        />
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
