import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatTaka } from "@/lib/edubridge";

export type TutorListItem = {
  id: string;
  user_id: string;
  bio: string | null;
  subjects: string[];
  levels: string[];
  hourly_rate: number | string;
  avg_rating: number | string;
  total_reviews: number;
  experience_years: number;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export function TutorCard({ tutor, matchScore }: { tutor: TutorListItem; matchScore?: number }) {
  const name = tutor.profiles?.full_name ?? "Tutor";
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar name={name} path={tutor.profiles?.avatar_url} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          <RatingStars value={tutor.avg_rating} showValue count={tutor.total_reviews} />
        </div>
        {typeof matchScore === "number" && (
          <Badge variant="secondary" className="shrink-0">
            {matchScore}% match
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.subjects.slice(0, 4).map((s) => (
          <Badge key={s} variant="secondary" className="font-normal">
            {s}
          </Badge>
        ))}
      </div>

      {tutor.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{tutor.bio}</p>}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-lg font-semibold text-foreground">{formatTaka(tutor.hourly_rate)}</p>
          <p className="text-xs text-muted-foreground">per session</p>
        </div>
        <Button asChild size="sm">
          <Link to="/student/tutor/$id" params={{ id: tutor.id }}>
            View profile
          </Link>
        </Button>
      </div>
    </article>
  );
}
