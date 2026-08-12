import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";

/**
 * Assign a role once. Safe to call twice: if a role already exists for the
 * user (the `user_roles_pick_once` policy rejects a second insert), we return
 * the existing role instead of surfacing an RLS error.
 */
export async function ensureRole(
  userId: string,
  role: AppRole,
): Promise<{ role: AppRole | null; error: string | null }> {
  const existing = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (existing.data?.role) return { role: existing.data.role as AppRole, error: null };

  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (!error) return { role, error: null };

  // Race or duplicate submit: re-check before reporting a failure.
  const recheck = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (recheck.data?.role) return { role: recheck.data.role as AppRole, error: null };

  return { role: null, error: error.message };
}
