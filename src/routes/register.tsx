import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, homePathForRole, type AppRole } from "@/hooks/use-auth";
import { ensureRole } from "@/lib/ensure-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — EduBridge" },
      {
        name: "description",
        content: "Sign up as a student or tutor on EduBridge and start connecting for home tuition in Bangladesh.",
      },
      { property: "og:title", content: "Create an account — EduBridge" },
      { property: "og:description", content: "Join EduBridge as a student or a tutor in under a minute." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, role, hasTutorProfile, loading, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) navigate({ to: homePathForRole(role, hasTutorProfile), replace: true });
  }, [user, role, hasTutorProfile, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSubmitting(false);
      toast.success("Check your email to confirm your account.");
      return;
    }
    const { role: assigned, error: roleError } = await ensureRole(data.session.user.id, selectedRole);
    setSubmitting(false);
    if (roleError || !assigned) {
      toast.error("Account created, but we couldn't set your role. Pick it on the next screen.");
      navigate({ to: "/select-role" });
      return;
    }
    refresh();
    toast.success("Account created!");
    navigate({ to: assigned === "tutor" ? "/tutor/profile-setup" : "/student/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">EduBridge</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">It takes less than a minute.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
