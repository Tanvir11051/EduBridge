import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Inbox, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { RatingStars } from "@/components/shared/rating-stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/tutor/dashboard")({
  head: () => ({
    meta: [
      { title: "Tutor dashboard — EduBridge" },
      { name: "description", content: "See your offers, published slots and rating at a glance." },
      { property: "og:title", content: "Tutor dashboard — EduBridge" },
      { property: "og:description", content: "Your EduBridge tutoring activity summary." },
    ],
  }),
  component: TutorDashboard,
});

function TutorDashboard() {
  const { user, profile } = useAuth();

  const tutorQuery = useQuery({
    queryKey: ["my-tutor-profile-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select("id, avg_rating, total_reviews, hourly_rate")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["my-slot-count", tutorQuery.data?.id],
    enabled: !!tutorQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_slots")
        .select("id, is_booked")
        .eq("tutor_id", tutorQuery.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const offersQuery = useQuery({
    queryKey: ["tutor-offers-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(OFFER_SELECT)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as OfferRow[];
    },
  });

  const offers = offersQuery.data ?? [];
  const slots = slotsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title={`Hello, ${profile?.full_name?.split(" ")[0] ?? "tutor"}`}
        subtitle="Your tutoring activity at a glance."
        action={
          <Button asChild>
            <Link to="/tutor/availability">
              <CalendarCheck className="mr-2 h-4 w-4" /> Manage availability
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Pending offers</p>
          <p className="mt-2 text-3xl font-semibold">{offers.filter((o) => o.status === "pending").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Booked slots</p>
          <p className="mt-2 text-3xl font-semibold">{slots.filter((s) => s.is_booked).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Open slots</p>
          <p className="mt-2 text-3xl font-semibold">{slots.filter((s) => !s.is_booked).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Rating</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-3xl font-semibold">{Number(tutorQuery.data?.avg_rating ?? 0).toFixed(1)}</p>
            <RatingStars value={tutorQuery.data?.avg_rating ?? 0} size={14} />
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent offers</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/tutor/offers">View inbox</Link>
          </Button>
        </div>
        {offersQuery.isLoading ? (
          <RowsSkeleton rows={3} />
        ) : offers.length === 0 ? (
          <EmptyState icon={Inbox} title="No offers yet" description="Publish more slots to attract students." />
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                to="/tutor/offer/$id"
                params={{ id: offer.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-foreground">{offer.profiles?.full_name ?? "Student"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(offer.created_at)} · {formatTaka(offer.total_amount)}
                  </p>
                </div>
                <StatusBadge status={offer.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Star className="h-4 w-4 text-primary" /> Reviews
        </h2>
        <p className="text-sm text-muted-foreground">
          You have {tutorQuery.data?.total_reviews ?? 0} review(s).{" "}
          <Link to="/tutor/reviews" className="font-medium text-primary hover:underline">
            Read them
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
