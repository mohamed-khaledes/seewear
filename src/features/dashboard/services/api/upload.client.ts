"use client";

import { STORAGE_BUCKET_PRODUCT_IMAGES } from "@/config/constants";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

/**
 * Uploads straight from the browser to the `product-images` bucket. Storage
 * policy allows this only for a non-demo admin, so a demo session gets a clear
 * refusal from Supabase rather than a silent no-op.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, AVIF or SVG file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Images need to be 5 MB or smaller.");
  }

  const supabase = createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "shot";
  const path = `${new Date().getFullYear()}/${base}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET_PRODUCT_IMAGES)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("row-level security")
        ? "Demo mode — uploads are disabled"
        : "That upload did not go through.",
    );
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET_PRODUCT_IMAGES)
    .getPublicUrl(path);

  return data.publicUrl;
}
