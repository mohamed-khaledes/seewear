import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only stars. The label carries the number for screen readers. */
export function Stars({
  rating,
  className,
  size = "size-3.5",
}: {
  rating: number;
  className?: string;
  size?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn(size, value <= Math.round(rating) ? "fill-ink text-ink" : "text-line")}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
