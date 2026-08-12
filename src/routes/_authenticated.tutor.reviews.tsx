import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/tutor/reviews")({
  head: () => ({
    meta: [
      { title: "My reviews — EduBridge" },
      { name: "description", content: "Read the feedback students left after your tuition sessions." },
      { property: "og:title", content: "My reviews — EduBridge" },
      { property: "og:description", content: "Student ratings and comments for your tutoring." },
    ],
  }),
  component: TutorReviews,
});

function TutorReviews() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["tutor-my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: tutor } = await supabase.from("tutor_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      if (!tutor) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles!reviews_student_id_fkey(full_name, avatar_url)")
        .eq("tutor_id", tutor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        profiles: { full_name: string; avatar_url: string | null } | null;
      }[];
    },
  });

  const reviews = data ?? [];

  return (
    <div>
      <PageHeader title="My reviews" subtitle="Feedback from students after accepted offers." />
      {isLoading ? (
        <RowsSkeleton />
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews appear after students complete sessions." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <UserAvatar name={r.profiles?.full_name ?? "Student"} path={r.profiles?.avatar_url} className="h-9 w-9" />
                <div>
                  <p className="text-sm font-medium text-foreground">{r.profiles?.full_name ?? "Student"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                </div>
                <RatingStars value={r.rating} size={15} className="ml-auto" />
              </div>
              {r.comment && <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
