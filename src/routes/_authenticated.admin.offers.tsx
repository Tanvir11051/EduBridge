import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({
    meta: [
      { title: "All offers — EduBridge admin" },
      { name: "description", content: "Monitor every tuition offer exchanged on the EduBridge platform." },
      { property: "og:title", content: "All offers — EduBridge admin" },
      { property: "og:description", content: "Platform-wide offer activity." },
    ],
  }),
  component: AdminOffers,
});

const TABS = ["all", "pending", "accepted", "rejected", "cancelled"] as const;

function AdminOffers() {
  const [tab, setTab] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select(OFFER_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const offers = (data ?? []).filter((o) => tab === "all" || o.status === tab);

  return (
    <div>
      <PageHeader title="All offers" subtitle="Every offer between students and tutors." />
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <RowsSkeleton />
      ) : offers.length === 0 ? (
        <EmptyState icon={Inbox} title="No offers" description="Nothing matches this filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-foreground">{o.profiles?.full_name ?? "—"}</TableCell>
                  <TableCell>{o.tutor_profiles?.profiles?.full_name ?? "—"}</TableCell>
                  <TableCell>{o.offer_slots.length}</TableCell>
                  <TableCell>{formatTaka(o.total_amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
