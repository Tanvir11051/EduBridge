import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { TutorProfileForm } from "@/components/shared/tutor-profile-form";

export const Route = createFileRoute("/_authenticated/tutor/profile-setup")({
  head: () => ({
    meta: [
      { title: "Set up your tutor profile — EduBridge" },
      { name: "description", content: "Add your subjects, levels, rate and experience so students can find you." },
      { property: "og:title", content: "Set up your tutor profile — EduBridge" },
      { property: "og:description", content: "Complete your EduBridge tutor profile to start receiving offers." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader
        title="Set up your tutor profile"
        subtitle="Students search on these details, so be specific."
      />
      <TutorProfileForm redirectOnCreate />
    </div>
  ),
});
