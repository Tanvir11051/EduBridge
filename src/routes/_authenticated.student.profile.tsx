import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/shared/profile-form";

export const Route = createFileRoute("/_authenticated/student/profile")({
  head: () => ({
    meta: [
      { title: "My profile — EduBridge" },
      { name: "description", content: "Update your EduBridge contact details, address and profile photo." },
      { property: "og:title", content: "My profile — EduBridge" },
      { property: "og:description", content: "Keep your student profile up to date." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="My profile" subtitle="Tutors see these details when you send an offer." />
      <ProfileForm />
    </div>
  ),
});
