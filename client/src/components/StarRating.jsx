import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value = 0,
  onChange,
  size = 18,
  readOnly = false,
  className,
}) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {stars.map((star) => {
        const filled = star <= Math.round(value);

        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={cn(
              "transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            )}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={
                filled
                  ? "fill-warning text-warning"
                  : "fill-none text-muted-foreground"
              }
            />
          </button>
        );
      })}
    </div>
  );
}