import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth, homePathForRole, type AppRole } from "@/hooks/use-auth";

export function RoleLayout({ allow }: { allow: AppRole }) {
  const { role, loading, hasTutorProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate({ to: "/select-role", replace: true });
      return;
    }
    if (role !== allow) {
      navigate({ to: homePathForRole(role, hasTutorProfile), replace: true });
    }
  }, [role, loading, allow, hasTutorProfile, navigate]);

  if (loading || role !== allow) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
