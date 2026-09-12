"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useSessionUser } from "@/features/auth/components/session-provider";
import {
  useToggleWishlist,
  useWishlistIds,
} from "@/features/wishlist/hooks/use-wishlist";

type WishlistButtonProps = {
  productId: string;
  productName: string;
  className?: string;
  variant?: "icon" | "labelled";
};

export function WishlistButton({
  productId,
  productName,
  className,
  variant = "icon",
}: WishlistButtonProps) {
  const user = useSessionUser();
  const router = useRouter();
  const { data: ids } = useWishlistIds(Boolean(user));
  const toggle = useToggleWishlist();

  const saved = ids?.includes(productId) ?? false;

  function onClick() {
    if (!user) {
      toast("Sign in to save pieces", {
        description: "Your wishlist follows your account.",
        action: { label: "Sign in", onClick: () => router.push("/login?next=/wishlist") },
      });
      return;
    }
    toggle.mutate({ productId, wanted: !saved });
  }

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={cn(
          "up-sm inline-flex h-12 items-center justify-center gap-2 border border-line px-5 font-semibold transition-colors hover:border-ink",
          className,
        )}
      >
        <Heart className={cn("size-4", saved && "fill-sale text-sale")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName}`}
      className={cn(
        "grid size-8 place-items-center rounded-full border border-line bg-white/90 text-ink backdrop-blur transition-colors hover:border-ink",
        className,
      )}
    >
      <Heart className={cn("size-4", saved && "fill-sale text-sale")} strokeWidth={1.6} />
    </button>
  );
}
