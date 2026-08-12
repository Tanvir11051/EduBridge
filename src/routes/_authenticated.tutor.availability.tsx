import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DAYS, formatTime } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/tutor/availability")({
  head: () => ({
    meta: [
      { title: "My availability — EduBridge" },
      { name: "description", content: "Publish the weekly time slots students can book with you." },
      { property: "og:title", content: "My availability — EduBridge" },
      { property: "og:description", content: "Manage your weekly tutoring slots on EduBridge." },
    ],
  }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("18:30");
  const [saving, setSaving] = useState(false);

  const tutorQuery = useQuery({
    queryKey: ["my-tutor-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tutor_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tutorId = tutorQuery.data?.id;

  const slotsQuery = useQuery({
    queryKey: ["my-slots", tutorId],
    enabled: !!tutorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_slots")
        .select("id, day_of_week, start_time, end_time, is_booked")
        .eq("tutor_id", tutorId!)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addSlot() {
    if (!tutorId) return;
    if (start >= end) {
      toast.error("End time must be after the start time.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("schedule_slots").insert({
      tutor_id: tutorId,
      day_of_week: Number(day),
      start_time: start,
      end_time: end,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Slot added.");
    void queryClient.invalidateQueries({ queryKey: ["my-slots", tutorId] });
  }

  async function removeSlot(id: string) {
    const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
    if (error) {
      toast.error("Booked slots can't be deleted.");
      return;
    }
    toast.success("Slot removed.");
    void queryClient.invalidateQueries({ queryKey: ["my-slots", tutorId] });
  }

  const slots = slotsQuery.data ?? [];

  return (
    <div>
      <PageHeader title="My availability" subtitle="Students can only book the slots you publish here." />

      <div className="mb-8 grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => (
                <SelectItem key={d} value={String(i)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="start">Start</Label>
          <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End</Label>
          <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button onClick={() => void addSlot()} disabled={saving || !tutorId}>
          <Plus className="mr-2 h-4 w-4" /> Add slot
        </Button>
      </div>

      {slotsQuery.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((d, i) => {
            const daySlots = slots.filter((s) => s.day_of_week === i);
            return (
              <div key={d} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground">{d}</p>
                {daySlots.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No slots</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {daySlots.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                      >
                        <span className={s.is_booked ? "text-muted-foreground" : "text-foreground"}>
                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          {s.is_booked && " · booked"}
                        </span>
                        {!s.is_booked && (
                          <button
                            onClick={() => void removeSlot(s.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete slot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
