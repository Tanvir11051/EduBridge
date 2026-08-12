import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, MessageSquareWarning, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TutorCard, type TutorListItem } from "@/components/shared/tutor-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({
    meta: [
      { title: "Student dashboard — EduBridge" },
      { name: "description", content: "Track your tutor offers, reviews and recommendations on EduBridge." },
      { property: "og:title", content: "Student dashboard — EduBridge" },
      { property: "og:description", content: "Your EduBridge offers, reviews and recommended tutors." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { profile } = useAuth();

  const offersQuery = useQuery({
    queryKey: ["student-offers"],
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

  const tutorsQuery = useQuery({
    queryKey: ["recommended-tutors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select(
          "id, user_id, bio, subjects, levels, hourly_rate, avg_rating, total_reviews, experience_years, profiles(full_name, avatar_url)",
        )
        .eq("is_active", true)
        .order("avg_rating", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as unknown as TutorListItem[];
    },
  });

  const offers = offersQuery.data ?? [];
  const stats = [
    { label: "Total offers", value: offers.length, icon: CalendarCheck },
    { label: "Pending", value: offers.filter((o) => o.status === "pending").length, icon: Search },
    { label: "Accepted", value: offers.filter((o) => o.status === "accepted").length, icon: Star },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? "student"}`}
        subtitle="Here's what's happening with your tuition search."
        action={
          <Button asChild>
            <Link to="/student/search">
              <Search className="mr-2 h-4 w-4" /> Find tutors
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent offers</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/student/offers">View all</Link>
          </Button>
        </div>
        {offersQuery.isLoading ? (
          <LoadingSkeleton count={2} />
        ) : offers.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="No offers yet"
            description="Find a tutor whose availability fits your schedule and send your first offer."
            action={
              <Button asChild>
                <Link to="/student/search">Browse tutors</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                to="/student/offer/$id"
                params={{ id: offer.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {offer.tutor_profiles?.profiles?.full_name ?? "Tutor"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(offer.created_at)} · {offer.offer_slots.length} slot(s) ·{" "}
                    {formatTaka(offer.total_amount)}
                  </p>
                </div>
                <StatusBadge status={offer.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recommended tutors</h2>
        {tutorsQuery.isLoading ? (
          <LoadingSkeleton count={3} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(tutorsQuery.data ?? []).map((t) => (
              <TutorCard key={t.id} tutor={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
