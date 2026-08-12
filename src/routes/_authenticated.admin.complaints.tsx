import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/admin/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — EduBridge admin" },
      { name: "description", content: "Review, annotate and resolve complaints raised by students and tutors." },
      { property: "og:title", content: "Complaints — EduBridge admin" },
      { property: "og:description", content: "Moderation queue for EduBridge complaints." },
    ],
  }),
  component: AdminComplaints,
});

const TABS = ["all", "open", "in_review", "resolved"] as const;

function AdminComplaints() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select(
          "id, title, description, status, admin_note, created_at, raised:profiles!complaints_raised_by_fkey(full_name), target:profiles!complaints_against_fkey(full_name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        title: string;
        description: string;
        status: string;
        admin_note: string | null;
        created_at: string;
        raised: { full_name: string } | null;
        target: { full_name: string } | null;
      }[];
    },
  });

  async function update(id: string, status: string) {
    const { error } = await supabase
      .from("complaints")
      .update({ status, admin_note: notes[id]?.trim() || undefined })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Complaint updated.");
    void queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
  }

  const complaints = (data ?? []).filter((c) => tab === "all" || c.status === tab);

  return (
    <div>
      <PageHeader title="Complaints" subtitle="Investigate reports and record your decision." />
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <RowsSkeleton />
      ) : complaints.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Nothing to review" description="This queue is empty." />
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.raised?.full_name ?? "Unknown"} → {c.target?.full_name ?? "Unknown"} ·{" "}
                    {formatDate(c.created_at)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
              {c.admin_note && (
                <div className="mt-3 rounded-lg bg-accent/50 p-3 text-sm text-accent-foreground">
                  <span className="font-medium">Current note: </span>
                  {c.admin_note}
                </div>
              )}
              <Textarea
                className="mt-4"
                rows={2}
                placeholder="Add an admin note…"
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void update(c.id, "in_review")}>
                  Mark in review
                </Button>
                <Button size="sm" onClick={() => void update(c.id, "resolved")}>
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
