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

export const Route = createFileRoute("/_authenticated/tutor/offers")({
  head: () => ({
    meta: [
      { title: "Offer inbox — EduBridge" },
      { name: "description", content: "Review and respond to tuition offers students sent you." },
      { property: "og:title", content: "Offer inbox — EduBridge" },
      { property: "og:description", content: "Accept or decline student offers on EduBridge." },
    ],
  }),
  component: TutorOffers,
});

const TABS = ["all", "pending", "accepted", "rejected", "cancelled"] as const;

function TutorOffers() {
  const [tab, setTab] = useState<string>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["tutor-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select(OFFER_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const offers = (data ?? []).filter((o) => tab === "all" || o.status === tab);

  return (
    <div>
      <PageHeader title="Offer inbox" subtitle="Respond quickly — students often message several tutors." />

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
        <EmptyState icon={Inbox} title="No offers here" description="New student offers will appear in this inbox." />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={offer.profiles?.full_name ?? "Student"} path={offer.profiles?.avatar_url} />
                  <div>
                    <p className="font-medium text-foreground">{offer.profiles?.full_name ?? "Student"}</p>
                    <p className="text-sm text-muted-foreground">Received {formatDate(offer.created_at)}</p>
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
                <Button asChild size="sm">
                  <Link to="/tutor/offer/$id" params={{ id: offer.id }}>
                    Review offer
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
