"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { toPiastres } from "@/lib/utils";
import { assertCanManageStore } from "./guards.server";
import {
  productFormSchema,
  type ActionResult,
  type ProductFormValues,
} from "@/features/dashboard/types";

function revalidateCatalog(slug?: string) {
  revalidatePath("/dashboard/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/product/${slug}`);
}

type PreparedProduct = {
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  status: "active" | "draft";
  featured: boolean;
};

function prepare(values: ProductFormValues): PreparedProduct {
  const priceCents = toPiastres(values.price);
  const compareCents = toPiastres(values.compareAt);

  return {
    slug: values.slug,
    name: values.name,
    description: values.description || null,
    category_id: values.categoryId || null,
    price_cents: priceCents,
    // A compare-at at or below the price is not a sale, it is noise.
    compare_at_cents: compareCents > priceCents ? compareCents : null,
    status: values.status,
    featured: values.featured,
  };
}

export async function createProductAction(
  values: ProductFormValues,
): Promise<ActionResult<{ id: string }>> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert(prepare(parsed.data))
    .select("id, slug")
    .single();

  if (error || !product) {
    return {
      ok: false,
      error:
        error?.code === "23505"
          ? "That slug is already taken."
          : "We could not save that product.",
    };
  }

  const sync = await syncChildren(supabase, product.id, parsed.data);
  if (sync) return sync;

  revalidateCatalog(product.slug);
  return { ok: true, data: { id: product.id } };
}

export async function updateProductAction(
  id: string,
  values: ProductFormValues,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("products").update(prepare(parsed.data)).eq("id", id);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "That slug is already taken."
          : "We could not save that product.",
    };
  }

  const sync = await syncChildren(supabase, id, parsed.data);
  if (sync) return sync;

  revalidateCatalog(parsed.data.slug);
  return { ok: true };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "We could not delete that product." };
  }

  revalidateCatalog();
  return { ok: true };
}

export async function setProductStatusAction(
  id: string,
  status: "active" | "draft",
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", id);

  if (error) return { ok: false, error: "We could not change that status." };

  revalidateCatalog();
  return { ok: true };
}

/**
 * Images and variants are replaced wholesale from the form. Variants are matched
 * by id so stock on an untouched row survives; removed ones are deleted, which
 * is safe because order items keep their own snapshot.
 */
async function syncChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  values: ProductFormValues,
): Promise<ActionResult | null> {
  const { error: clearImages } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (clearImages) return { ok: false, error: "We could not update the images." };

  if (values.imageUrls.length > 0) {
    const { error } = await supabase.from("product_images").insert(
      values.imageUrls.map((url, position) => ({
        product_id: productId,
        url,
        alt: `${values.name}${position > 0 ? ` — view ${position + 1}` : ""}`,
        position,
      })),
    );
    if (error) return { ok: false, error: "We could not save the images." };
  }

  const keepIds = values.variants
    .map((variant) => variant.id)
    .filter((id): id is string => Boolean(id));

  let deleteQuery = supabase.from("product_variants").delete().eq("product_id", productId);
  if (keepIds.length > 0) deleteQuery = deleteQuery.not("id", "in", `(${keepIds.join(",")})`);

  const { error: deleteError } = await deleteQuery;
  if (deleteError) return { ok: false, error: "We could not update the variants." };

  if (values.variants.length === 0) return null;

  const rows = values.variants.map((variant) => ({
    ...(variant.id ? { id: variant.id } : {}),
    product_id: productId,
    color: variant.color || null,
    color_hex: variant.colorHex || null,
    size: variant.size || null,
    sku: variant.sku || null,
    stock: variant.stock,
    price_cents: null,
  }));

  const { error: upsertError } = await supabase
    .from("product_variants")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    return {
      ok: false,
      error:
        upsertError.code === "23505"
          ? "Two variants share the same SKU or colour/size pair."
          : "We could not save the variants.",
    };
  }

  return null;
}
