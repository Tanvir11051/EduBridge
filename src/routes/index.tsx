import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, GraduationCap, ShieldCheck, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorCard, type TutorListItem } from "@/components/shared/tutor-card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homePathForRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduBridge — Find Trusted Home Tutors in Bangladesh" },
      {
        name: "description",
        content:
          "Browse verified home tutors across Bangladesh, compare ratings and rates, and book real availability slots on EduBridge.",
      },
      { property: "og:title", content: "EduBridge — Find Trusted Home Tutors in Bangladesh" },
      {
        property: "og:description",
        content: "Verified tutors, transparent rates and slot-based booking for students and guardians.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Search, title: "Smart tutor search", body: "Filter by subject, level, budget and location to shortlist quickly." },
  { icon: CalendarCheck, title: "Real availability", body: "Tutors publish weekly slots — you book the one that fits." },
  { icon: ShieldCheck, title: "Accountable platform", body: "Admin-reviewed complaints keep the community safe." },
  { icon: Star, title: "Honest reviews", body: "Ratings come only from students with accepted offers." },
];

function Landing() {
  const { user, role, hasTutorProfile, loading } = useAuth();

  const { data: tutors, isLoading } = useQuery({
    queryKey: ["featured-tutors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select(
          "id, user_id, bio, subjects, levels, hourly_rate, avg_rating, total_reviews, experience_years, profiles(full_name, avatar_url)",
        )
        .order("avg_rating", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as TutorListItem[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">EduBridge</span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <Button asChild>
                <Link to={homePathForRole(role, hasTutorProfile)}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <BookOpen className="h-3.5 w-3.5" /> Trusted by students across Bangladesh
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Find the right home tutor, without the guesswork.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              EduBridge connects students and guardians with verified tutors. Compare ratings and rates, then send an
              offer for a slot that actually works for both of you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/register">Find a tutor</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">Become a tutor</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Top rated tutors</h2>
          <p className="mt-1 text-sm text-muted-foreground">A glimpse of the tutors already teaching on EduBridge.</p>
          <div className="mt-8">
            {isLoading ? (
              <LoadingSkeleton count={3} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(tutors ?? []).map((t) => (
                  <TutorCard key={t.id} tutor={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} EduBridge. Built for students and tutors in Bangladesh.
        </div>
      </footer>
    </div>
  );
}
