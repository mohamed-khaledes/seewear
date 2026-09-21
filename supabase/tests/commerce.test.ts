/**
 * Every migration, applied to real Postgres (PGlite, in WebAssembly) exactly as
 * the Supabase CLI applies them — one transaction per file — and then the
 * stock, payment and permission rules exercised against it.
 *
 * This is the test that would have caught "confirmed used in the same
 * transaction that adds it", a revoke that locked admins out of cancelling,
 * or a hold that decremented half an order before failing.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../migrations/", import.meta.url));
const ADMIN = "00000000-0000-0000-0000-00000000000a";
const BUYER = "00000000-0000-0000-0000-00000000000b";
const OTHER = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;

type Row = Record<string, unknown>;
const one = async <T extends Row>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0];

/** Who the next statements run as: a real SQL role plus the JWT claims. */
async function as(role: "service_role" | "authenticated", sub?: string) {
  await db.exec(role === "service_role" ? "reset role" : "set role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify(sub ? { role, sub } : { role }),
  ]);
}

/** One RPC call in its own transaction, as PostgREST runs it. */
async function attempt(sql: string, params: unknown[] = []) {
  await db.exec("begin");
  try {
    const result = await db.query<Row>(sql, params);
    await db.exec("commit");
    return { ok: true as const, rows: result.rows };
  } catch (error) {
    await db.exec("rollback");
    return { ok: false as const, error: (error as Error).message };
  }
}

const stock = async () =>
  (await one<{ stock: number }>("select stock from product_variants where sku = 'T-1'")).stock;

async function newOrder(method: "card" | "cod", qty: number, userId: string | null = null) {
  const { next } = await one<{ next: string }>("select public.next_order_number() as next");
  const order = await one<{ id: string }>(
    `insert into orders (order_number, user_id, email, subtotal_cents, total_cents, shipping_address, payment_method)
     values ($1, $2, 'buyer@example.com', 100000, 114000, '{}'::jsonb, $3) returning id`,
    [next, userId, method],
  );
  const variant = await one<{ id: string; product_id: string }>(
    "select id, product_id from product_variants where sku = 'T-1'",
  );
  await db.query(
    `insert into order_items (order_id, product_id, variant_id, name, price_cents, quantity)
     values ($1, $2, $3, 'Tee', 50000, $4)`,
    [order.id, variant.product_id, variant.id, qty],
  );
  return order.id;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { citext, pg_trgm, pgcrypto } });

  // The parts of Supabase the migrations lean on.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role supabase_auth_admin nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
  `);

  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    try {
      await db.exec(`begin;\n${sql}\ncommit;`);
    } catch (error) {
      await db.exec("rollback").catch(() => {});
      throw new Error(`${file} failed to apply: ${(error as Error).message}`);
    }
  }

  // Supabase grants these by default; RLS then does the real deciding.
  await db.exec(`
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant all on all tables in schema public to anon, authenticated, service_role;
    grant all on all sequences in schema public to anon, authenticated, service_role;
    grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;

    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@example.com'), ('${BUYER}', 'buyer@example.com'), ('${OTHER}', 'other@example.com');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into categories (slug, name) values ('tees', 'Tees');
    insert into products (slug, name, price_cents, status, category_id)
      select 'tee', 'Tee', 50000, 'active', id from categories where slug = 'tees';
    insert into product_variants (product_id, color, size, sku, stock)
      select id, 'Black', 'M', 'T-1', 3 from products where slug = 'tee';
  `);
  await as("service_role");
});

afterAll(async () => {
  await db?.close();
});

describe("stock holds", () => {
  let first: string;

  it("takes an order's units the moment it exists", async () => {
    first = await newOrder("card", 2);
    const result = await attempt("select public.hold_order_stock($1) as held", [first]);
    expect(result.ok).toBe(true);
    expect(await stock()).toBe(1);
  });

  it("never takes the same order's units twice", async () => {
    await attempt("select public.hold_order_stock($1)", [first]);
    expect(await stock()).toBe(1);
  });

  it("refuses an order bigger than what is left, and takes nothing", async () => {
    const second = await newOrder("card", 2);
    const result = await attempt("select public.hold_order_stock($1)", [second]);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(/insufficient_stock/);
    expect(await stock()).toBe(1);
    await db.exec(`delete from orders where id = '${second}'`);
  });

  it("marks it paid without decrementing again, and issues an invoice", async () => {
    const result = await attempt("select public.apply_paid_order($1) as applied", [first]);
    expect(result.ok && result.rows[0].applied).toBe(true);
    expect(await stock()).toBe(1);
    const order = await one<{ status: string; invoice_number: string }>(
      "select status, invoice_number from orders where id = $1",
      [first],
    );
    expect(order.status).toBe("paid");
    expect(order.invoice_number).toMatch(/^INV-\d{4}-001001$/);
  });

  it("ignores a replayed payment callback", async () => {
    const result = await attempt("select public.apply_paid_order($1) as applied", [first]);
    expect(result.ok && result.rows[0].applied).toBe(false);
  });

  it("logs every status change with the trigger", async () => {
    const events = await db.query<{ status: string }>(
      "select status from order_events where order_id = $1 order by created_at, id",
      [first],
    );
    expect(events.rows.map((row) => row.status)).toEqual(["pending", "paid"]);
  });
});

describe("expiry and late payment", () => {
  let late: string;

  it("gives an abandoned checkout's stock back", async () => {
    late = await newOrder("card", 1);
    await attempt("select public.hold_order_stock($1)", [late]);
    expect(await stock()).toBe(0);

    const result = await attempt("select public.expire_order($1) as expired", [late]);
    expect(result.ok && result.rows[0].expired).toBe(true);
    expect(await stock()).toBe(1);

    const order = await one<{ status: string; expired_at: string | null; invoice_number: string | null }>(
      "select status, expired_at, invoice_number from orders where id = $1",
      [late],
    );
    expect(order.status).toBe("cancelled");
    expect(order.expired_at).not.toBeNull();
    expect(order.invoice_number).toBeNull();
  });

  it("still completes an expired order when its payment turns up, and flags it", async () => {
    const result = await attempt("select public.apply_paid_order($1) as applied", [late]);
    expect(result.ok && result.rows[0].applied).toBe(true);
    const order = await one<{ status: string; status_note: string }>(
      "select status, status_note from orders where id = $1",
      [late],
    );
    expect(order.status).toBe("paid");
    expect(order.status_note).toMatch(/expired/);
    expect(await stock()).toBe(0);
  });
});

describe("cash on delivery and cancelling", () => {
  let cash: string;

  it("confirms and invoices a cash order and holds its stock", async () => {
    await db.exec("update product_variants set stock = 5 where sku = 'T-1'");
    cash = await newOrder("cod", 2, BUYER);
    await attempt("select public.hold_order_stock($1)", [cash]);
    await attempt("update orders set status = 'confirmed' where id = $1", [cash]);
    const order = await one<{ status: string; invoice_number: string | null }>(
      "select status, invoice_number from orders where id = $1",
      [cash],
    );
    expect(order.status).toBe("confirmed");
    expect(order.invoice_number).not.toBeNull();
    expect(await stock()).toBe(3);
  });

  it("never expires a cash order", async () => {
    const result = await attempt("select public.expire_order($1) as expired", [cash]);
    expect(result.ok && result.rows[0].expired).toBe(false);
  });

  it("will not let a customer cancel through the function", async () => {
    await as("authenticated", OTHER);
    const result = await attempt("select public.cancel_order($1)", [cash]);
    expect(result.ok).toBe(false);
  });

  it("lets an admin cancel, and gives the stock back in the same step", async () => {
    await as("authenticated", ADMIN);
    const result = await attempt("select public.cancel_order($1, 'Changed mind') as cancelled", [cash]);
    expect(result.ok && result.rows[0].cancelled).toBe(true);
    expect(await stock()).toBe(5);
  });

  it("gives nothing back twice", async () => {
    const result = await attempt("select public.release_order_stock($1) as released", [cash]);
    expect(result.ok && result.rows[0].released).toBe(false);
    expect(await stock()).toBe(5);
  });

  it("will not let a customer hold stock directly", async () => {
    await as("authenticated", OTHER);
    const result = await attempt("select public.hold_order_stock($1)", [cash]);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(/permission denied/);
    await as("service_role");
  });
});

describe("refunds", () => {
  it("never records more refunded than was paid", async () => {
    const order = await newOrder("card", 1);
    const result = await attempt("update orders set refunded_cents = total_cents + 1 where id = $1", [order]);
    expect(result.ok).toBe(false);
  });
});

describe("reviews", () => {
  let productId: string;

  beforeAll(async () => {
    await as("service_role");
    const delivered = await newOrder("cod", 1, BUYER);
    await db.exec(`update orders set status = 'delivered' where id = '${delivered}'`);
    productId = (await one<{ id: string }>("select id from products where slug = 'tee'")).id;
  });

  it("accepts a review from someone whose order was delivered", async () => {
    await as("authenticated", BUYER);
    const result = await attempt(
      "insert into reviews (product_id, user_id, rating, author_name) values ($1, $2, 5, 'B.')",
      [productId, BUYER],
    );
    expect(result.ok).toBe(true);
  });

  it("refuses someone who never received the piece", async () => {
    await as("authenticated", OTHER);
    const result = await attempt(
      "insert into reviews (product_id, user_id, rating, author_name) values ($1, $2, 4, 'O.')",
      [productId, OTHER],
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a review written in someone else's name", async () => {
    const result = await attempt(
      "insert into reviews (product_id, user_id, rating, author_name) values ($1, $2, 4, 'O.')",
      [productId, BUYER],
    );
    expect(result.ok).toBe(false);
    await as("service_role");
  });
});

describe("rate limits", () => {
  it("refuses the hit past the limit and resets with the window", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 3; i += 1) {
      hits.push((await one<{ ok: boolean }>("select public.hit_rate_limit('t:1', 60, 2) as ok")).ok);
    }
    expect(hits).toEqual([true, true, false]);

    await db.exec("update rate_limits set window_start = now() - interval '2 minutes'");
    expect((await one<{ ok: boolean }>("select public.hit_rate_limit('t:1', 60, 2) as ok")).ok).toBe(true);
  });
});

describe("dashboard revenue", () => {
  it("counts paid card orders and delivered cash orders, and nothing else", async () => {
    await as("authenticated", ADMIN);
    const result = await attempt("select public.admin_dashboard_stats(30) as s");
    expect(result.ok).toBe(true);
    const stats = result.ok ? (result.rows[0].s as { revenue_cents: number }) : null;
    // The late-paid card order and the delivered cash order, 114,000 each.
    // The first card order is still "paid" too: 3 × 114,000.
    expect(stats?.revenue_cents).toBe(342_000);
    await as("service_role");
  });
});
