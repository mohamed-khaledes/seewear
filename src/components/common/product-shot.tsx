import Image from "next/image";

import { cn } from "@/lib/utils";

type ProductShotProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * The square-ish product plate.
 *
 * The catalogue shots are square photographs on a light seamless backdrop that
 * matches this plate's ground, so they run full bleed — `object-cover` with no
 * padding. (They used to be small vector garments, which is why this once
 * centred a padded `object-contain`.) Falls back to an empty plate when a
 * product has no image yet.
 */
export function ProductShot({
  src,
  alt,
  className,
  imageClassName,
  sizes = "(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw",
  priority = false,
}: ProductShotProps) {
  return (
    <div
      className={cn(
        "relative aspect-[1/1.05] overflow-hidden bg-[#f6f6f4]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
            imageClassName,
          )}
        />
      ) : (
        <div className="grid h-full place-items-center">
          <span className="up-xs text-grey">No image yet</span>
        </div>
      )}
    </div>
  );
}
