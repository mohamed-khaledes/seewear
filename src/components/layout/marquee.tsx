import { cn } from "@/lib/utils";

/**
 * The scrolling strip under the hero. The track is duplicated so the -50%
 * translate loops seamlessly; the animation is disabled under
 * `prefers-reduced-motion` by the global rule in globals.css.
 */
export function Marquee({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  const track = [...items, ...items, ...items, ...items];

  return (
    <div
      className={cn(
        "overflow-hidden border-y border-line-dark bg-ink py-2.5 text-white",
        className,
      )}
    >
      <div className="inline-block animate-marquee whitespace-nowrap will-change-transform">
        {track.map((item, index) => (
          <span key={`${item}-${index}`}>
            <span className="up-xs mx-7 opacity-90">{item}</span>
            <span className="opacity-40" aria-hidden="true">
              ·
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
