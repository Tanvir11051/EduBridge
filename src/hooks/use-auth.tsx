import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "tutor" | "admin";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  hasTutorProfile: boolean;
  loading: boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setReady(true);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  const userId = session?.user.id ?? null;

  const accountQuery = useQuery({
    queryKey: ["account", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, roleRes, tutorRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, phone, address").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!).maybeSingle(),
        supabase.from("tutor_profiles").select("id").eq("user_id", userId!).maybeSingle(),
      ]);
      return {
        profile: (profileRes.data as Profile | null) ?? null,
        role: (roleRes.data?.role as AppRole | undefined) ?? null,
        hasTutorProfile: !!tutorRes.data,
      };
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile: accountQuery.data?.profile ?? null,
      role: accountQuery.data?.role ?? null,
      hasTutorProfile: accountQuery.data?.hasTutorProfile ?? false,
      loading: !ready || (!!userId && accountQuery.isLoading),
      refresh: () => queryClient.invalidateQueries({ queryKey: ["account", userId] }),
    }),
    [session, accountQuery.data, accountQuery.isLoading, ready, userId, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function homePathForRole(role: AppRole | null, hasTutorProfile = true) {
  if (role === "student") return "/student/dashboard";
  if (role === "tutor") return hasTutorProfile ? "/tutor/dashboard" : "/tutor/profile-setup";
  if (role === "admin") return "/admin/dashboard";
  return "/select-role";
}
