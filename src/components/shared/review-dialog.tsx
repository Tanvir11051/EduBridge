import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function ReviewDialog({
  open,
  onOpenChange,
  offerId,
  tutorId,
  tutorUserId,
  tutorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  tutorId: string;
  tutorUserId?: string;
  tutorName: string;
}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      tutor_id: tutorId,
      student_id: user.id,
      offer_id: offerId,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    if (tutorUserId) {
      await supabase.from("notifications").insert({
        user_id: tutorUserId,
        title: "New review received",
        body: `${profile?.full_name ?? "A student"} rated you ${rating} star(s).`,
      });
    }
    setSaving(false);
    onOpenChange(false);
    setComment("");
    toast.success("Review submitted. Thank you!");
    void queryClient.invalidateQueries();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {tutorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
                  <Star
                    className={cn("h-7 w-7", n <= rating ? "fill-warning text-warning" : "text-muted-foreground/40")}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-comment">Comment</Label>
            <Textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How were the sessions?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
