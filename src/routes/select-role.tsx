import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth, homePathForRole, type AppRole } from "@/hooks/use-auth";
import { ensureRole } from "@/lib/ensure-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/select-role")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose your role — EduBridge" },
      { name: "description", content: "Tell EduBridge whether you are joining as a student or a tutor." },
      { property: "og:title", content: "Choose your role — EduBridge" },
      { property: "og:description", content: "Pick a student or tutor account to finish setting up EduBridge." },
    ],
  }),
  component: SelectRolePage,
});

function SelectRolePage() {
  const navigate = useNavigate();
  const { user, role, hasTutorProfile, loading, refresh } = useAuth();
  const [selected, setSelected] = useState<AppRole>("student");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (role) navigate({ to: homePathForRole(role, hasTutorProfile), replace: true });
  }, [user, role, hasTutorProfile, loading, navigate]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { role: assigned, error } = await ensureRole(user.id, selected);
    setSaving(false);
    if (error || !assigned) {
      toast.error(error ?? "Could not set your role.");
      return;
    }
    refresh();
    navigate({ to: assigned === "tutor" ? "/tutor/profile-setup" : "/student/dashboard", replace: true });
  }

  const options = [
    { value: "student" as const, icon: BookOpen, title: "I'm a student / guardian", body: "Search tutors and send offers." },
    { value: "tutor" as const, icon: GraduationCap, title: "I'm a tutor", body: "Publish availability and receive offers." },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">How will you use EduBridge?</h1>
        <p className="mt-1 text-sm text-muted-foreground">You can only choose once, so pick carefully.</p>
        <div className="mt-6 grid gap-3">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSelected(o.value)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                selected === o.value
                  ? "border-primary bg-accent"
                  : "border-border bg-background hover:bg-accent/50",
              )}
            >
              <o.icon className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{o.title}</p>
                <p className="text-sm text-muted-foreground">{o.body}</p>
              </div>
            </button>
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}
