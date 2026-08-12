import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/shared/profile-form";
import { TutorProfileForm } from "@/components/shared/tutor-profile-form";

export const Route = createFileRoute("/_authenticated/tutor/profile")({
  head: () => ({
    meta: [
      { title: "Tutor profile — EduBridge" },
      { name: "description", content: "Edit your EduBridge tutor details, subjects, rate and contact information." },
      { property: "og:title", content: "Tutor profile — EduBridge" },
      { property: "og:description", content: "Keep your tutor listing accurate and attractive." },
    ],
  }),
  component: TutorProfilePage,
});

function TutorProfilePage() {
  return (
    <div className="space-y-10">
      <div>
        <PageHeader title="Personal details" subtitle="Shown to students when they contact you." />
        <ProfileForm />
      </div>
      <div>
        <PageHeader title="Tutor listing" subtitle="What students see in search results." />
        <TutorProfileForm />
      </div>
    </div>
  );
}
