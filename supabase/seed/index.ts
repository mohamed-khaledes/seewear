/**
 * Seeds the SEEWEAR database: categories, catalogue, the two demo accounts and
 * enough order history for the dashboard to look alive.
 *
 *   npm run db:seed
 *
 * Safe to re-run — everything is upserted by a natural key.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database, TablesInsert } from "@/types/database.types";
import { productPhotoPath } from "@/lib/utils/product-photos";
import { slugify } from "@/lib/utils/slugify";
import { trackingUrlFor } from "@/features/orders/services/utils/status";
import { seedCategories, seedProducts, type SeedProduct } from "./catalog";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} — add it to .env.local before seeding.`);
  }
  return value;
}

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * SKUs are the conflict target for the variant upsert, so this has to be
 * injective: every distinct product/colour/size triple needs its own string.
 * Abbreviating any part of it is what breaks that — "Black" and "Bone" share an
 * initial, and truncating the slug collapses the whole owners-club range.
 */
function skuFor(product: SeedProduct, color: string, size: string): string {
  return ["SW", product.slug, slugify(color), slugify(size)]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

/** Fails loudly with the offending SKUs rather than letting Postgres do it. */
function assertUniqueSkus(rows: TablesInsert<"product_variants">[]) {
  const seen = new Map<string, number>();
  for (const row of rows) {
    if (!row.sku) continue;
    seen.set(row.sku, (seen.get(row.sku) ?? 0) + 1);
  }

  const clashes = [...seen.entries()].filter(([, count]) => count > 1);
  if (clashes.length > 0) {
    throw new Error(
      `Duplicate SKUs in the seed catalogue: ${clashes
        .map(([sku, count]) => `${sku} (×${count})`)
        .join(", ")}`,
    );
  }
}

async function ensureDemoUser(options: {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "user";
}): Promise<string> {
  const { email, password, fullName, role } = options;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  let userId = created?.user?.id;

  if (error) {
    // Already there from a previous run — find them and reset the password so
    // the demo buttons keep working.
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;

    const existing = list.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!existing) throw error;

    userId = existing.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updateError) throw updateError;
  }

  if (!userId) throw new Error(`Could not resolve a user id for ${email}`);

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, full_name: fullName, role, is_demo: true },
      { onConflict: "id" },
    );
  if (profileError) throw profileError;

  // Read back rather than trust the upsert. A BEFORE UPDATE trigger on profiles
  // can clamp `role` and `is_demo` without raising, so a silent revert would
  // otherwise look like a clean seed and leave the demo admin unable to sign in
  // to the dashboard.
  const { data: saved, error: readError } = await supabase
    .from("profiles")
    .select("role, is_demo")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;

  if (!saved || saved.role !== role || saved.is_demo !== true) {
    throw new Error(
      `Profile for ${email} did not save: expected role='${role}', is_demo=true, ` +
        `got role='${saved?.role}', is_demo=${saved?.is_demo}. ` +
        "Apply the latest migrations (npm run db:push) and re-run the seed.",
    );
  }

  console.log(`  ${role === "admin" ? "demo admin   " : "demo customer"} ${email}`);
  return userId;
}

async function seedCatalog() {
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .upsert(seedCategories, { onConflict: "slug" })
    .select("id, slug");
  if (categoryError) throw categoryError;

  const categoryIdBySlug = new Map(categories.map((row) => [row.slug, row.id]));
  console.log(`  ${categories.length} categories`);

  const productRows: TablesInsert<"products">[] = seedProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    description: product.description,
    category_id: categoryIdBySlug.get(product.category) ?? null,
    price_cents: product.priceCents,
    compare_at_cents: product.compareAtCents,
    status: product.status,
    featured: product.featured,
  }));

  const { data: products, error: productError } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "slug" })
    .select("id, slug");
  if (productError) throw productError;

  const productIdBySlug = new Map(products.map((row) => [row.slug, row.id]));
  console.log(`  ${products.length} products`);

  const imageRows: TablesInsert<"product_images">[] = [];
  const variantRows: TablesInsert<"product_variants">[] = [];

  for (const product of seedProducts) {
    const productId = productIdBySlug.get(product.slug);
    if (!productId) continue;

    product.colors.forEach((color, colorIndex) => {
      imageRows.push({
        product_id: productId,
        url: productPhotoPath(product.slug, color.name),
        alt: `${product.name} in ${color.name}`,
        position: colorIndex,
      });

      product.sizes.forEach((size, sizeIndex) => {
        const patternIndex =
          (colorIndex * product.sizes.length + sizeIndex) % product.stockPattern.length;
        variantRows.push({
          product_id: productId,
          color: color.name,
          color_hex: color.hex,
          size,
          sku: skuFor(product, color.name, size),
          stock: product.stockPattern[patternIndex],
          price_cents: null,
        });
      });
    });
  }

  // Images have no natural unique key, so replace them wholesale.
  const productIds = [...productIdBySlug.values()];
  const { error: clearImagesError } = await supabase
    .from("product_images")
    .delete()
    .in("product_id", productIds);
  if (clearImagesError) throw clearImagesError;

  const { error: imageError } = await supabase.from("product_images").insert(imageRows);
  if (imageError) throw imageError;
  console.log(`  ${imageRows.length} product images`);

  assertUniqueSkus(variantRows);

  const { error: variantError } = await supabase
    .from("product_variants")
    .upsert(variantRows, { onConflict: "sku" });
  if (variantError) throw variantError;
  console.log(`  ${variantRows.length} variants`);
}

async function seedDiscounts() {
  const { error } = await supabase.from("discount_codes").upsert(
    [
      { code: "SEEWEAR10", percent_off: 10, min_subtotal_cents: 0, active: true },
      { code: "BLACKFRIDAY", percent_off: 25, min_subtotal_cents: 200_000, active: true },
      { code: "FREESHIP", amount_off_cents: 8_000, min_subtotal_cents: 150_000, active: true },
    ],
    { onConflict: "code" },
  );
  if (error) throw error;
  console.log("  3 discount codes");
}

const CUSTOMERS = [
  { name: "Ahmed Kamal", email: "ahmed.kamal@example.com", city: "Cairo" },
  { name: "Sara Mostafa", email: "sara.mostafa@example.com", city: "Alexandria" },
  { name: "Omar Tarek", email: "omar.tarek@example.com", city: "Giza" },
  { name: "Lina Hassan", email: "lina.hassan@example.com", city: "Al Mansurah" },
  { name: "Youssef Ali", email: "youssef.ali@example.com", city: "Cairo" },
  { name: "Nour Adel", email: "nour.adel@example.com", city: "Tanta" },
];

const ORDER_PLAN: {
  status: Database["public"]["Enums"]["order_status"];
  daysAgo: number;
  lines: number;
  payment: string | null;
  method: string;
  courier?: string;
  /** Cash on delivery: no card payment, and money only arrives at delivery. */
  cod?: true;
}[] = [
  { status: "confirmed", daysAgo: 0, lines: 1, payment: null, method: "Cash on delivery", cod: true },
  { status: "fulfilled", daysAgo: 2, lines: 2, payment: null, method: "Cash on delivery", courier: "Bosta", cod: true },
  { status: "delivered", daysAgo: 8, lines: 1, payment: "success", method: "Cash on delivery", courier: "Mylerz", cod: true },
  { status: "paid", daysAgo: 0, lines: 2, payment: "success", method: "Visa •••• 4242" },
  { status: "fulfilled", daysAgo: 1, lines: 1, payment: "success", method: "Mastercard •••• 5510", courier: "Bosta" },
  { status: "fulfilled", daysAgo: 3, lines: 3, payment: "success", method: "Visa •••• 1881", courier: "Mylerz" },
  { status: "refunded", daysAgo: 4, lines: 1, payment: "refunded", method: "Visa •••• 1881" },
  { status: "delivered", daysAgo: 5, lines: 2, payment: "success", method: "Visa •••• 4242", courier: "Bosta" },
  { status: "paid", daysAgo: 6, lines: 2, payment: "success", method: "Vodafone Cash" },
  { status: "pending", daysAgo: 7, lines: 1, payment: "pending", method: "Visa •••• 3009" },
  { status: "delivered", daysAgo: 9, lines: 1, payment: "success", method: "Mastercard •••• 5510", courier: "Aramex" },
  { status: "fulfilled", daysAgo: 11, lines: 2, payment: "success", method: "Visa •••• 4242", courier: "Bosta" },
  { status: "fulfilled", daysAgo: 15, lines: 1, payment: "success", method: "Mastercard •••• 5510", courier: "R2S" },
  { status: "paid", daysAgo: 19, lines: 3, payment: "success", method: "Visa •••• 4242" },
  { status: "cancelled", daysAgo: 22, lines: 1, payment: "declined", method: "Visa •••• 0002" },
  { status: "delivered", daysAgo: 26, lines: 2, payment: "success", method: "Vodafone Cash", courier: "Mylerz" },
  { status: "fulfilled", daysAgo: 29, lines: 1, payment: "success", method: "Visa •••• 4242", courier: "Bosta" },
];

/**
 * The dated trail behind each seeded order.
 *
 * A trigger on `orders` writes one event the moment a row is inserted, stamped
 * with the insert time — right for a real order, useless for one backdated by a
 * month. The seed throws that single row away and writes the history the order
 * would have had, so the customer timeline and the dashboard activity list have
 * something to show.
 */
function eventTrail(
  status: Database["public"]["Enums"]["order_status"],
  createdAt: Date,
  courier?: string,
  cod = false,
): { status: Database["public"]["Enums"]["order_status"]; note: string | null; created_at: string }[] {
  const at = (hours: number) =>
    new Date(
      Math.min(createdAt.getTime() + hours * 3_600_000, Date.now()),
    ).toISOString();

  const placed = { status: "pending" as const, note: null, created_at: at(0) };
  // A cash order is confirmed on the spot; a card order clears when Paymob says so.
  const cleared = cod
    ? { status: "confirmed" as const, note: "Confirmed. Pay in cash when the courier arrives.", created_at: at(0.01) }
    : { status: "paid" as const, note: null, created_at: at(0.4) };
  const shipped = {
    status: "fulfilled" as const,
    note: courier ? `Collected by ${courier} from the Cairo warehouse.` : null,
    created_at: at(21),
  };

  switch (status) {
    case "pending":
      return [placed];
    case "confirmed":
    case "paid":
      return [placed, cleared];
    case "fulfilled":
      return [placed, cleared, shipped];
    case "delivered":
      return [
        placed,
        cleared,
        shipped,
        {
          status: "delivered",
          note: cod ? "Signed for and paid in cash at the door." : "Signed for at the door.",
          created_at: at(69),
        },
      ];
    case "cancelled":
      return [
        placed,
        { status: "cancelled", note: "Payment never cleared.", created_at: at(26) },
      ];
    case "refunded":
      return [
        placed,
        cleared,
        { status: "refunded", note: "Returned to the original card.", created_at: at(47) },
      ];
  }
}

/** A believable consignment number, stable for a given order index. */
function consignment(index: number): string {
  return String(41_720_000 + index * 1_337);
}

async function seedOrders(demoCustomerId: string) {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    console.log("  orders already present — skipped");
    return;
  }

  const { data: variants, error: variantError } = await supabase
    .from("product_variants")
    .select("id, color, size, stock, product_id, products(name, slug, price_cents)")
    .gt("stock", 0)
    .limit(200);
  if (variantError) throw variantError;

  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("product_id, url, position")
    .order("position");
  if (imageError) throw imageError;

  const imageByProduct = new Map<string, string>();
  for (const image of images) {
    if (!imageByProduct.has(image.product_id)) {
      imageByProduct.set(image.product_id, image.url);
    }
  }

  const usable = variants.filter((variant) => variant.products !== null);
  if (usable.length === 0) throw new Error("No variants to build seed orders from");

  let cursor = 0;

  for (const [index, plan] of ORDER_PLAN.entries()) {
    const customer = CUSTOMERS[index % CUSTOMERS.length];
    // Every third order belongs to the demo customer so their account has history.
    const asDemoCustomer = index % 3 === 0;

    const lines = Array.from({ length: plan.lines }, () => {
      const variant = usable[cursor % usable.length];
      cursor += 1;
      return { variant, quantity: (cursor % 2) + 1 };
    });

    const subtotal = lines.reduce(
      (total, line) => total + line.variant.products!.price_cents * line.quantity,
      0,
    );
    const shipping = subtotal >= 400_000 ? 0 : 8_000;
    const tax = Math.round(subtotal * 0.14);
    const total = subtotal + shipping + tax;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - plan.daysAgo);
    createdAt.setHours(9 + (index % 12), (index * 7) % 60, 0, 0);

    const trail = eventTrail(plan.status, createdAt, plan.courier, plan.cod);
    const tracking = plan.courier ? consignment(index) : null;

    const { data: orderNumberData, error: orderNumberError } =
      await supabase.rpc("next_order_number");
    if (orderNumberError) throw orderNumberError;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumberData,
        user_id: asDemoCustomer ? demoCustomerId : null,
        email: asDemoCustomer ? requireEnv("DEMO_CUSTOMER_EMAIL") : customer.email,
        status: plan.status,
        payment_method: plan.cod ? "cod" : "card",
        refunded_cents: plan.status === "refunded" ? total : 0,
        subtotal_cents: subtotal,
        shipping_cents: shipping,
        tax_cents: tax,
        total_cents: total,
        shipping_address: {
          full_name: asDemoCustomer ? "Demo Customer" : customer.name,
          phone: "+20 100 000 0000",
          line1: `${10 + index} Street 9`,
          city: customer.city,
          governorate: customer.city,
          country: "Egypt",
        },
        fulfilled_at:
          trail.find((event) => event.status === "fulfilled")?.created_at ?? null,
        delivered_at:
          trail.find((event) => event.status === "delivered")?.created_at ?? null,
        courier: plan.courier ?? null,
        tracking_number: tracking,
        tracking_url: plan.courier && tracking ? trackingUrlFor(plan.courier, tracking) : null,
        status_note: trail[trail.length - 1].note,
        created_at: createdAt.toISOString(),
      })
      .select("id")
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.variant.product_id,
        variant_id: line.variant.id,
        name: line.variant.products!.name,
        slug: line.variant.products!.slug,
        color: line.variant.color,
        size: line.variant.size,
        image_url: imageByProduct.get(line.variant.product_id) ?? null,
        price_cents: line.variant.products!.price_cents,
        quantity: line.quantity,
      })),
    );
    if (itemsError) throw itemsError;

    if (plan.payment) {
      const { error: paymentError } = await supabase.from("payments").insert({
        order_id: order.id,
        provider: plan.cod ? "cash" : "paymob",
        paymob_order_id: plan.cod ? null : `${920000 + index}`,
        transaction_id: plan.cod ? `cash-${orderNumberData}` : `seed-${order.id.slice(0, 8)}`,
        method: plan.method,
        amount_cents: plan.payment === "refunded" ? -total : total,
        status: plan.payment,
        // Cash is recorded by hand, never verified by a Paymob callback.
        hmac_verified: !plan.cod && plan.payment !== "pending",
        created_at: createdAt.toISOString(),
      });
      if (paymentError) throw paymentError;
    }

    // The trigger stamped one event at insert time. Throw it away and write the
    // history this backdated order would really have had.
    await supabase.from("order_events").delete().eq("order_id", order.id);
    const { error: eventError } = await supabase
      .from("order_events")
      .insert(trail.map((event) => ({ order_id: order.id, ...event })));
    if (eventError) throw eventError;
  }

  console.log(`  ${ORDER_PLAN.length} orders with items, payments and status history`);
}

async function main() {
  console.log("Seeding SEEWEAR…\n");

  console.log("Demo accounts");
  await ensureDemoUser({
    email: requireEnv("DEMO_ADMIN_EMAIL"),
    password: requireEnv("DEMO_ADMIN_PASSWORD"),
    fullName: "Demo Admin",
    role: "admin",
  });
  const demoCustomerId = await ensureDemoUser({
    email: requireEnv("DEMO_CUSTOMER_EMAIL"),
    password: requireEnv("DEMO_CUSTOMER_PASSWORD"),
    fullName: "Demo Customer",
    role: "user",
  });

  console.log("\nCatalogue");
  await seedCatalog();
  await seedDiscounts();

  console.log("\nOrders");
  await seedOrders(demoCustomerId);

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
