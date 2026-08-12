import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, ShieldAlert, Users, Inbox } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — EduBridge" },
      { name: "description", content: "Platform overview: users, tutors, offers and open complaints." },
      { property: "og:title", content: "Admin dashboard — EduBridge" },
      { property: "og:description", content: "EduBridge moderation and platform metrics." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, tutors, offers, complaints] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tutor_profiles").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("complaints").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      ]);
      return {
        users: users.count ?? 0,
        tutors: tutors.count ?? 0,
        offers: offers.count ?? 0,
        complaints: complaints.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total users", value: data?.users ?? 0, icon: Users, to: "/admin/users" },
    { label: "Tutors", value: data?.tutors ?? 0, icon: GraduationCap, to: "/admin/users" },
    { label: "Offers", value: data?.offers ?? 0, icon: Inbox, to: "/admin/offers" },
    { label: "Unresolved complaints", value: data?.complaints ?? 0, icon: ShieldAlert, to: "/admin/complaints" },
  ];

  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Platform health and moderation queue." />
      {isLoading ? (
        <RowsSkeleton rows={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <c.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-foreground">{c.value}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
