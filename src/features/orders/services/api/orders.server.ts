import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderDetail, OrderListItem } from "@/features/orders/types";

const LIST_COLUMNS = `
  id, order_number, status, total_cents, created_at, email,
  items:order_items(name, color, size, quantity, image_url)
`;

const DETAIL_COLUMNS = `
  *,
  items:order_items(*),
  payments:payments(id, status, method, amount_cents, created_at, transaction_id, hmac_verified)
`;

/** RLS scopes this to the signed-in customer. */
export async function getMyOrders(): Promise<OrderListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<OrderListItem[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getMyOrder(orderNumber: string): Promise<OrderDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(DETAIL_COLUMNS)
    .eq("order_number", orderNumber)
    .maybeSingle<OrderDetail>();

  if (error) throw error;
  return data;
}
