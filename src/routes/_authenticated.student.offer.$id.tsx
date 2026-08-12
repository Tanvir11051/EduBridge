import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { RowsSkeleton } from "@/components/shared/loading-skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReviewDialog } from "@/components/shared/review-dialog";
import { ComplaintDialog } from "@/components/shared/complaint-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OFFER_SELECT, type OfferRow } from "@/lib/selects";
import { formatDate, formatSlot, formatTaka } from "@/lib/edubridge";

export const Route = createFileRoute("/_authenticated/student/offer/$id")({
  head: () => ({
    meta: [
      { title: "Offer details — EduBridge" },
      { name: "description", content: "Review the slots, price and status of your EduBridge tuition offer." },
      { property: "og:title", content: "Offer details — EduBridge" },
      { property: "og:description", content: "Manage a single tuition offer: cancel, review or report." },
    ],
  }),
  component: StudentOfferDetail,
});

function StudentOfferDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);

  const offerQuery = useQuery({
    queryKey: ["offer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers").select(OFFER_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as OfferRow | null;
    },
  });

  const reviewQuery = useQuery({
    queryKey: ["offer-review", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id, rating").eq("offer_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const offer = offerQuery.data;

  async function cancelOffer() {
    if (!offer) return;
    const { error } = await supabase.from("offers").update({ status: "cancelled" }).eq("id", offer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (offer.tutor_profiles?.user_id) {
      await supabase.from("notifications").insert({
        user_id: offer.tutor_profiles.user_id,
        title: "Offer cancelled",
        body: "A student cancelled their tuition offer.",
      });
    }
    toast.success("Offer cancelled.");
    void queryClient.invalidateQueries();
  }

  if (offerQuery.isLoading) return <RowsSkeleton rows={3} />;
  if (!offer) return <EmptyState title="Offer not found" description="This offer may have been removed." />;

  const tutorName = offer.tutor_profiles?.profiles?.full_name ?? "Tutor";

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/student/offers">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to offers
        </Link>
      </Button>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={tutorName} path={offer.tutor_profiles?.profiles?.avatar_url} className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{tutorName}</h1>
              <p className="text-sm text-muted-foreground">Sent {formatDate(offer.created_at)}</p>
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
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your message</p>
            <p className="mt-1 text-sm text-muted-foreground">{offer.message}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
          {offer.status === "pending" && (
            <Button variant="outline" onClick={() => setConfirmCancel(true)}>
              Cancel offer
            </Button>
          )}
          {offer.status === "accepted" && !reviewQuery.data && (
            <Button onClick={() => setReviewOpen(true)}>
              <Star className="mr-2 h-4 w-4" /> Leave a review
            </Button>
          )}
          {offer.tutor_profiles?.user_id && (
            <Button variant="ghost" className="text-destructive" onClick={() => setComplaintOpen(true)}>
              <Flag className="mr-2 h-4 w-4" /> Report an issue
            </Button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this offer?"
        description="The tutor will be notified that you withdrew the offer."
        confirmLabel="Cancel offer"
        destructive
        onConfirm={() => void cancelOffer()}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        offerId={offer.id}
        tutorId={offer.tutor_id}
        {...(offer.tutor_profiles?.user_id ? { tutorUserId: offer.tutor_profiles.user_id } : {})}
        tutorName={tutorName}
      />

      {offer.tutor_profiles?.user_id && (
        <ComplaintDialog
          open={complaintOpen}
          onOpenChange={setComplaintOpen}
          againstUserId={offer.tutor_profiles.user_id}
          againstName={tutorName}
          offerId={offer.id}
        />
      )}
    </div>
  );
}
