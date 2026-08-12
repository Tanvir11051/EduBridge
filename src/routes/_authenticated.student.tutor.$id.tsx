import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DAYS, formatDate, formatTaka, formatTime } from "@/lib/edubridge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/tutor/$id")({
  head: () => ({
    meta: [
      { title: "Tutor profile — EduBridge" },
      { name: "description", content: "See a tutor's subjects, rate, reviews and weekly availability on EduBridge." },
      { property: "og:title", content: "Tutor profile — EduBridge" },
      { property: "og:description", content: "Review tutor details and send a booking offer." },
    ],
  }),
  component: TutorDetail,
});

type TutorDetailRow = {
  id: string;
  user_id: string;
  bio: string | null;
  qualifications: string | null;
  subjects: string[];
  levels: string[];
  hourly_rate: number | string;
  experience_years: number;
  avg_rating: number | string;
  total_reviews: number;
  profiles: { full_name: string; avatar_url: string | null; address: string | null } | null;
};

function TutorDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tutorQuery = useQuery({
    queryKey: ["tutor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select(
          "id, user_id, bio, qualifications, subjects, levels, hourly_rate, experience_years, avg_rating, total_reviews, profiles(full_name, avatar_url, address)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TutorDetailRow | null;
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["tutor-slots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_slots")
        .select("id, day_of_week, start_time, end_time, is_booked")
        .eq("tutor_id", id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["tutor-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, profiles!reviews_student_id_fkey(full_name, avatar_url)")
        .eq("tutor_id", id)
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

  const tutor = tutorQuery.data;
  const slots = slotsQuery.data ?? [];
  const rate = Number(tutor?.hourly_rate ?? 0);
  const total = rate * selected.length;

  function toggle(slotId: string) {
    setSelected((prev) => (prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]));
  }

  async function sendOffer() {
    if (!user || !tutor) return;
    setSubmitting(true);
    const { data: offer, error } = await supabase
      .from("offers")
      .insert({
        student_id: user.id,
        tutor_id: tutor.id,
        proposed_location: location.trim() || null,
        message: message.trim() || null,
        status: "pending",
        total_amount: total,
      })
      .select("id")
      .single();

    if (error || !offer) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not create the offer.");
      return;
    }

    const { error: slotError } = await supabase
      .from("offer_slots")
      .insert(selected.map((slot_id) => ({ offer_id: offer.id, slot_id })));
    if (slotError) {
      setSubmitting(false);
      toast.error(slotError.message);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: tutor.user_id,
      title: "New tuition offer",
      body: `You received a new offer for ${selected.length} slot(s) worth ${formatTaka(total)}.`,
    });

    setSubmitting(false);
    setOpen(false);
    toast.success("Offer sent to the tutor.");
    navigate({ to: "/student/offer/$id", params: { id: offer.id } });
  }

  if (tutorQuery.isLoading) return <RowsSkeleton />;
  if (!tutor) return <EmptyState title="Tutor not found" description="This tutor profile is no longer available." />;

  const name = tutor.profiles?.full_name ?? "Tutor";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            <UserAvatar name={name} path={tutor.profiles?.avatar_url} className="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
              <RatingStars value={tutor.avg_rating} showValue count={tutor.total_reviews} className="mt-1" />
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> {tutor.experience_years} yrs experience
                </span>
                {tutor.profiles?.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {tutor.profiles.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {tutor.bio && <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{tutor.bio}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subjects</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tutor.subjects.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Levels</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tutor.levels.map((l) => (
                  <Badge key={l} variant="outline">
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {tutor.qualifications && (
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-accent/50 p-4 text-sm text-accent-foreground">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{tutor.qualifications}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Weekly availability</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select the slots you'd like to book.</p>
          <div className="mt-4 space-y-4">
            {DAYS.map((day, index) => {
              const daySlots = slots.filter((s) => s.day_of_week === index);
              if (daySlots.length === 0) return null;
              return (
                <div key={day}>
                  <p className="text-sm font-medium text-foreground">{day}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {daySlots.map((slot) => {
                      const active = selected.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={slot.is_booked}
                          onClick={() => toggle(slot.id)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm transition-colors",
                            slot.is_booked
                              ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                              : active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-accent",
                          )}
                        >
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {slots.length === 0 && <p className="text-sm text-muted-foreground">This tutor hasn't published slots yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
          {reviewsQuery.isLoading ? (
            <RowsSkeleton rows={2} />
          ) : (reviewsQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {(reviewsQuery.data ?? []).map((r) => (
                <li key={r.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={r.profiles?.full_name ?? "Student"} path={r.profiles?.avatar_url} className="h-8 w-8" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.profiles?.full_name ?? "Student"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                    <RatingStars value={r.rating} size={14} className="ml-auto" />
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="h-fit lg:sticky lg:top-24">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-3xl font-semibold text-foreground">{formatTaka(rate)}</p>
          <p className="text-sm text-muted-foreground">per session</p>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selected slots</span>
              <span className="font-medium text-foreground">{selected.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold text-foreground">{formatTaka(total)}</span>
            </div>
          </div>
          <Button className="mt-5 w-full" disabled={selected.length === 0} onClick={() => setOpen(true)}>
            Send offer
          </Button>
          {selected.length === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">Pick at least one slot to continue.</p>
          )}
        </div>
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send an offer to {name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <p className="font-medium text-foreground">
                {selected.length} slot(s) · {formatTaka(total)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-location">Proposed location</Label>
              <Input
                id="offer-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Student's home, Dhanmondi 27"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message">Message</Label>
              <Textarea
                id="offer-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your goals, syllabus or preferred start date."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void sendOffer()} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
