import { createFileRoute } from "@tanstack/react-router";
import { RoleLayout } from "@/components/layout/role-layout";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: () => <RoleLayout allow="tutor" />,
});
