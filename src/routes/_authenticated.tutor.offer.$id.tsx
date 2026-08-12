import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ComplaintDialog } from "@/components/shared/complaint-dialog";
import { supabase } from "@/integrations/supabase/client";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatSlot, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/tutor/offer/$id")({
  head: () => ({
    meta: [
      { title: "Offer details — EduBridge" },
      { name: "description", content: "Accept or decline a student's tuition offer and see the requested slots." },
      { property: "og:title", content: "Offer details — EduBridge" },
      { property: "og:description", content: "Respond to a student's booking request." },
    ],
  }),
  component: TutorOfferDetail,
});

function TutorOfferDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<"accepted" | "rejected" | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["tutor-offer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select(OFFER_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as OfferRow | null;
    },
  });

  async function respond(status: "accepted" | "rejected") {
    if (!offer) return;
    const { error } = await supabase.from("offers").update({ status }).eq("id", offer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "accepted") {
      const slotIds = offer.offer_slots.map((s) => s.schedule_slots?.id).filter(Boolean) as string[];
      if (slotIds.length > 0) {
        await supabase
          .from("schedule_slots")
          .update({ is_booked: true, booked_offer_id: offer.id })
          .in("id", slotIds);
      }
    }
    await supabase.from("notifications").insert({
      user_id: offer.student_id,
      title: status === "accepted" ? "Offer accepted" : "Offer declined",
      body:
        status === "accepted"
          ? "Your tutor accepted the offer. You can now leave a review after your sessions."
          : "Your tutor declined this offer. Try another tutor or different slots.",
    });
    toast.success(status === "accepted" ? "Offer accepted." : "Offer declined.");
    void queryClient.invalidateQueries();
  }

  if (isLoading) return <RowsSkeleton rows={3} />;
  if (!offer) return <EmptyState title="Offer not found" description="This offer may have been removed." />;

  const studentName = offer.profiles?.full_name ?? "Student";

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/tutor/offers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to inbox
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={studentName} path={offer.profiles?.avatar_url} className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{studentName}</h1>
              <p className="text-sm text-muted-foreground">Received {formatDate(offer.created_at)}</p>
            </div>
          </div>
          <StatusBadge status={offer.status} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed location</dt>
            <dd className="mt-1 text-sm text-foreground">{offer.proposed_location ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total amount</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{formatTaka(offer.total_amount)}</dd>
          </div>
          {offer.status === "accepted" && offer.profiles?.phone && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</dt>
              <dd className="mt-1 text-sm text-foreground">{offer.profiles.phone}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requested slots</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {offer.offer_slots.map(
              (s) =>
                s.schedule_slots && (
                  <span
                    key={s.schedule_slots.id}
                    className="rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {formatSlot(s.schedule_slots)}
                  </span>
                ),
            )}
          </div>
        </div>

        {offer.message && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</p>
            <p className="mt-1 text-sm text-muted-foreground">{offer.message}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          {offer.status === "pending" && (
            <>
              <Button onClick={() => setAction("accepted")}>
                <Check className="mr-2 h-4 w-4" /> Accept offer
              </Button>
              <Button variant="outline" onClick={() => setAction("rejected")}>
                <X className="mr-2 h-4 w-4" /> Decline
              </Button>
            </>
          )}
          <Button variant="ghost" className="text-destructive" onClick={() => setComplaintOpen(true)}>
            <Flag className="mr-2 h-4 w-4" /> Report an issue
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action === "accepted" ? "Accept this offer?" : "Decline this offer?"}
        description={
          action === "accepted"
            ? "The selected slots will be marked as booked and the student will be notified."
            : "The student will be notified that you declined."
        }
        confirmLabel={action === "accepted" ? "Accept" : "Decline"}
        destructive={action === "rejected"}
        onConfirm={() => {
          if (action) void respond(action);
          setAction(null);
        }}
      />

      <ComplaintDialog
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
        againstUserId={offer.student_id}
        againstName={studentName}
        offerId={offer.id}
      />
    </div>
  );
}
