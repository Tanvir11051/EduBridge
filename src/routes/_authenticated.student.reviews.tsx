import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { RatingStars } from "@/components/shared/rating-stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/reviews")({
  head: () => ({
    meta: [
      { title: "My reviews — EduBridge" },
      { name: "description", content: "See all the reviews you have written for tutors on EduBridge." },
      { property: "og:title", content: "My reviews — EduBridge" },
      { property: "og:description", content: "Your written tutor reviews and ratings." },
    ],
  }),
  component: StudentReviews,
});

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  tutor_profiles: { id: string; profiles: { full_name: string } | null } | null;
};

function StudentReviews() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, tutor_profiles(id, profiles(full_name))")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const reviews = data ?? [];

  return (
    <div>
      <PageHeader title="My reviews" subtitle="Feedback you've left for tutors after accepted offers." />
      {isLoading ? (
        <RowsSkeleton />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews written yet"
          description="Once a tutor accepts your offer you can rate your experience."
          action={
            <Button asChild>
              <Link to="/student/offers">View offers</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{r.tutor_profiles?.profiles?.full_name ?? "Tutor"}</p>
                <RatingStars value={r.rating} size={15} />
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
              <p className="mt-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
