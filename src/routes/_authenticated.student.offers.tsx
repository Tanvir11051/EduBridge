import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatSlot, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/offers")({
  head: () => ({
    meta: [
      { title: "My offers — EduBridge" },
      { name: "description", content: "Track every tuition offer you have sent to tutors on EduBridge." },
      { property: "og:title", content: "My offers — EduBridge" },
      { property: "og:description", content: "Pending, accepted and rejected tuition offers in one place." },
    ],
  }),
  component: StudentOffers,
});

const TABS = ["all", "pending", "accepted", "rejected", "cancelled"] as const;

function StudentOffers() {
  const [tab, setTab] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["student-offers-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select(OFFER_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const offers = (data ?? []).filter((o) => tab === "all" || o.status === tab);

  return (
    <div>
      <PageHeader title="My offers" subtitle="Every offer you've sent, with its current status." />

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
        <EmptyState
          icon={Inbox}
          title="No offers here"
          description="Offers you send to tutors will appear in this list."
          action={
            <Button asChild>
              <Link to="/student/search">Find a tutor</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={offer.tutor_profiles?.profiles?.full_name ?? "Tutor"}
                    path={offer.tutor_profiles?.profiles?.avatar_url}
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {offer.tutor_profiles?.profiles?.full_name ?? "Tutor"}
                    </p>
                    <p className="text-sm text-muted-foreground">Sent {formatDate(offer.created_at)}</p>
                  </div>
                </div>
                <StatusBadge status={offer.status} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {offer.offer_slots.map(
                  (s) =>
                    s.schedule_slots && (
                      <span
                        key={s.schedule_slots.id}
                        className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                      >
                        {formatSlot(s.schedule_slots)}
                      </span>
                    ),
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Total <span className="font-semibold text-foreground">{formatTaka(offer.total_amount)}</span>
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/student/offer/$id" params={{ id: offer.id }}>
                    View details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
