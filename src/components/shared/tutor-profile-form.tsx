import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { youtubeId } from "@/components/shared/demo-videos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LEVELS, SUBJECTS } from "@/lib/edubridge";
import { cn } from "@/lib/utils";


export function TutorProfileForm({ redirectOnCreate = false }: { redirectOnCreate?: boolean }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [rate, setRate] = useState("800");
  const [experience, setExperience] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["my-tutor-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_profiles")
        .select("id, bio, qualifications, subjects, levels, hourly_rate, experience_years, is_active")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    setBio(existing.bio ?? "");
    setQualifications(existing.qualifications ?? "");
    setSubjects(existing.subjects ?? []);
    setLevels(existing.levels ?? []);
    setRate(String(existing.hourly_rate ?? "800"));
    setExperience(String(existing.experience_years ?? 0));
    setIsActive(existing.is_active ?? true);
  }, [existing]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (subjects.length === 0) {
      toast.error("Pick at least one subject.");
      return;
    }
    setSaving(true);
    const payload = {
      bio: bio.trim() || null,
      qualifications: qualifications.trim() || null,
      subjects,
      levels,
      hourly_rate: Number(rate) || 0,
      experience_years: Number(experience) || 0,
      is_active: isActive,
    };
    const { error } = existing
      ? await supabase.from("tutor_profiles").update(payload).eq("id", existing.id)
      : await supabase.from("tutor_profiles").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
    toast.success(existing ? "Tutor profile updated." : "Tutor profile created.");
    if (!existing && redirectOnCreate) navigate({ to: "/tutor/availability" });
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell students about your teaching style and results."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quals">Qualifications</Label>
        <Input
          id="quals"
          value={qualifications}
          onChange={(e) => setQualifications(e.target.value)}
          placeholder="e.g. BSc in Physics, University of Dhaka"
        />
      </div>

      <div className="space-y-2">
        <Label>Subjects you teach</Label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(subjects, setSubjects, s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                subjects.includes(s)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Levels</Label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggle(levels, setLevels, l)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                levels.includes(l)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rate">Rate per session (৳)</Label>
          <Input id="rate" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp">Years of experience</Label>
          <Input id="exp" type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Visible in search</p>
          <p className="text-sm text-muted-foreground">Turn off to pause new offers.</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {existing ? "Save changes" : "Create tutor profile"}
      </Button>
    </form>
  );
}
