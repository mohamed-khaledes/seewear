import { garmentMarkup, type GarmentArtName } from "@/lib/utils/garments";
import { cn } from "@/lib/utils";

type GarmentArtProps = {
  art: GarmentArtName;
  color: string;
  className?: string;
};

/**
 * Inline garment vector, for decoration (hero line-up, editorial blocks).
 * Product shots use the generated files in /public/garments instead.
 */
export function GarmentArt({ art, color, className }: GarmentArtProps) {
  const id = `${art}-${color.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      className={cn("h-auto w-full", className)}
      dangerouslySetInnerHTML={{ __html: garmentMarkup(art, color, `-${id}`) }}
    />
  );
}
