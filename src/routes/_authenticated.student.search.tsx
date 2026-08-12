import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TutorCard, type TutorListItem } from "@/components/shared/tutor-card";
import { supabase } from "@/integrations/supabase/client";
import { LEVELS, SUBJECTS, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/search")({
  head: () => ({
    meta: [
      { title: "Find tutors — EduBridge" },
      { name: "description", content: "Search EduBridge tutors by subject, level, budget, rating and location." },
      { property: "og:title", content: "Find tutors — EduBridge" },
      { property: "og:description", content: "Filter verified tutors and shortlist the right match." },
    ],
  }),
  component: SearchPage,
});

type TutorSearchItem = TutorListItem & { profiles: TutorListItem["profiles"] & { address?: string | null } };

function SearchPage() {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [maxRate, setMaxRate] = useState(2000);
  const [minRating, setMinRating] = useState(0);
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("rating");
  const [onlyRated, setOnlyRated] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tutor-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select(
          "id, user_id, bio, subjects, levels, hourly_rate, avg_rating, total_reviews, experience_years, profiles(full_name, avatar_url, address)",
        )
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as TutorSearchItem[];
    },
  });

  const results = useMemo(() => {
    const list = (data ?? []).filter((t) => {
      const name = t.profiles?.full_name?.toLowerCase() ?? "";
      const address = t.profiles?.address?.toLowerCase() ?? "";
      if (q && !name.includes(q.toLowerCase()) && !t.subjects.join(" ").toLowerCase().includes(q.toLowerCase()))
        return false;
      if (subject !== "all" && !t.subjects.includes(subject)) return false;
      if (level !== "all" && !t.levels.includes(level)) return false;
      if (Number(t.hourly_rate) > maxRate) return false;
      if (Number(t.avg_rating) < minRating) return false;
      if (onlyRated && t.total_reviews === 0) return false;
      if (location && !address.includes(location.toLowerCase())) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sort === "rate-asc") return Number(a.hourly_rate) - Number(b.hourly_rate);
      if (sort === "rate-desc") return Number(b.hourly_rate) - Number(a.hourly_rate);
      if (sort === "experience") return b.experience_years - a.experience_years;
      return Number(b.avg_rating) - Number(a.avg_rating);
    });
  }, [data, q, subject, level, maxRate, minRating, location, sort, onlyRated]);

  function reset() {
    setQ("");
    setSubject("all");
    setLevel("all");
    setMaxRate(2000);
    setMinRating(0);
    setLocation("");
    setOnlyRated(false);
  }

  return (
    <div>
      <PageHeader title="Find tutors" subtitle="Filter by subject, level, budget and area to find your match." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or subject" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max rate: {formatTaka(maxRate)}</Label>
              <Slider
                value={[maxRate]}
                min={200}
                max={3000}
                step={100}
                onValueChange={(v) => setMaxRate(v[0] ?? 2000)}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum rating: {minRating.toFixed(1)}</Label>
              <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={(v) => setMinRating(v[0] ?? 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc">Area</Label>
              <Input
                id="loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Dhanmondi"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={onlyRated} onCheckedChange={(v) => setOnlyRated(v === true)} />
              Only reviewed tutors
            </label>
            <Button variant="outline" className="w-full" onClick={reset}>
              Reset filters
            </Button>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{results.length} tutor(s) found</p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="rate-asc">Lowest rate</SelectItem>
                <SelectItem value="rate-desc">Highest rate</SelectItem>
                <SelectItem value="experience">Most experienced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No tutors match your filters"
              description="Try widening your budget or clearing a filter."
              action={
                <Button variant="outline" onClick={reset}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map((t) => (
                <TutorCard key={t.id} tutor={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
