"use client";

import { createClient } from "@/lib/supabase/client";

/** Product ids the signed-in user has hearted. Empty for guests. */
export async function fetchWishlistIds(): Promise<string[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id);

  if (error) throw error;
  return data.map((row) => row.product_id);
}

export async function toggleWishlistItem(
  productId: string,
  wanted: boolean,
): Promise<boolean> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not-authenticated");

  if (wanted) {
    const { error } = await supabase
      .from("wishlist_items")
      .upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id" });
    if (error) throw error;
    return true;
  }

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
  if (error) throw error;
  return false;
}
