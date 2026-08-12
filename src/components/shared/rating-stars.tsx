import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 16,
  showValue = false,
  count,
  className,
}: {
  value: number | string;
  size?: number;
  showValue?: boolean;
  count?: number;
  className?: string;
}) {
  const rating = typeof value === "string" ? Number(value) : value;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = rating >= i + 1;
          const half = !filled && rating >= i + 0.5;
          return half ? (
            <StarHalf key={i} size={size} className="fill-warning text-warning" />
          ) : (
            <Star
              key={i}
              size={size}
              className={filled ? "fill-warning text-warning" : "text-muted-foreground/40"}
            />
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground">
          {rating.toFixed(1)}
          {typeof count === "number" && ` (${count})`}
        </span>
      )}
    </div>
  );
}
