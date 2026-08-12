import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function ComplaintDialog({
  open,
  onOpenChange,
  againstUserId,
  againstName,
  offerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  againstUserId: string;
  againstName: string;
  offerId?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Please add a title and description.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("complaints").insert({
      raised_by: user.id,
      against: againstUserId,
      offer_id: offerId ?? null,
      title: title.trim(),
      description: description.trim(),
      status: "open",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onOpenChange(false);
    setTitle("");
    setDescription("");
    toast.success("Complaint submitted. An admin will review it.");
    void queryClient.invalidateQueries();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue with {againstName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="complaint-title">Title</Label>
            <Input
              id="complaint-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complaint-desc">What happened?</Label>
            <Textarea
              id="complaint-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give the admin team as much detail as you can."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit complaint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
