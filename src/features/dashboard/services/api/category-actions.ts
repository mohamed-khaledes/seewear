"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { assertCanManageStore } from "./guards.server";
import {
  categoryFormSchema,
  type ActionResult,
  type CategoryFormValues,
} from "@/features/dashboard/types";

/**
 * A category shows up in four places: the dashboard list, the product form's
 * picker, the storefront filter rail and the sitemap. All four are cached, so
 * all four have to be told.
 */
function revalidateCategories() {
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  revalidatePath("/products");
  revalidatePath("/sitemap.xml");
}

export async function saveCategoryAction(
  values: CategoryFormValues,
  id?: string,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const row = {
    name: parsed.data.name,
    slug: parsed.data.slug.toLowerCase(),
    position: parsed.data.position,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? `The slug “${row.slug}” is already taken.`
          : "We could not save that category.",
    };
  }

  revalidateCategories();
  return { ok: true };
}

/**
 * Deleting a category that still holds products is refused rather than allowed.
 *
 * The foreign key is `on delete set null`, so the database would accept it and
 * quietly leave those products uncategorised — findable only by search, and
 * missing from every category page. Moving them first is the admin's decision
 * to make, so this says what is in the way instead of making it for them.
 */
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) return { ok: false, error: "We could not check that category." };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} product${count === 1 ? "" : "s"} still sit${
        count === 1 ? "s" : ""
      } in this category. Move them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "We could not delete that category." };

  revalidateCategories();
  return { ok: true };
}

/**
 * Moves one category past its neighbour.
 *
 * Every position is rewritten rather than the two being swapped: the seed left
 * several categories sharing position 0, and swapping two equal numbers moves
 * nothing on screen. Rewriting also repairs the ordering as a side effect.
 */
export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .order("position")
    .order("name");

  if (error) return { ok: false, error: "We could not read the category order." };

  const ordered = data ?? [];
  const index = ordered.findIndex((category) => category.id === id);
  const target = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || target < 0 || target >= ordered.length) return { ok: true };

  const reordered = [...ordered];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  const writes = await Promise.all(
    reordered.map((category, position) =>
      supabase.from("categories").update({ position }).eq("id", category.id),
    ),
  );

  if (writes.some((write) => write.error)) {
    return { ok: false, error: "We could not reorder the categories." };
  }

  revalidateCategories();
  return { ok: true };
}
