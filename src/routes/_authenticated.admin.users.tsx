import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users — EduBridge admin" },
      { name: "description", content: "Browse every student, tutor and admin registered on EduBridge." },
      { property: "og:title", content: "Users — EduBridge admin" },
      { property: "og:description", content: "Directory of EduBridge accounts." },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, phone, address, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roles = new Map((rolesRes.data ?? []).map((r) => [r.user_id, r.role as string]));
      return (profilesRes.data ?? []).map((p) => ({ ...p, role: roles.get(p.id) ?? "—" }));
    },
  });

  const users = useMemo(
    () => (data ?? []).filter((u) => u.full_name?.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <div>
      <PageHeader title="Users" subtitle="Everyone registered on the platform." />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name"
        className="mb-4 max-w-sm"
        aria-label="Search users"
      />
      {isLoading ? (
        <RowsSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.full_name} path={u.avatar_url} className="h-8 w-8" />
                      <span className="font-medium text-foreground">{u.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{u.address ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
