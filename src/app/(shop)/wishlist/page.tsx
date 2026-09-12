import type { Metadata } from "next";

import { WishlistPage } from "@/features/wishlist/server";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default function Page() {
  return <WishlistPage />;
}
