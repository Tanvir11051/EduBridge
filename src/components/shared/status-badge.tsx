import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  accepted: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  open: "bg-warning/15 text-warning-foreground border-warning/30",
  in_review: "bg-info/12 text-info border-info/30",
  resolved: "bg-primary/12 text-primary border-primary/30",
};

const LABELS: Record<string, string> = {
  in_review: "In review",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STYLES[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
