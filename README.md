# SEEWEAR

A premium men's-clothing store: dark, minimal storefront, guest checkout in **EGP**
through Paymob, and a full admin dashboard — with one-tap demo logins so anyone can
see both sides without signing up.

Architecture, conventions and the build phases live in [CLAUDE.md](CLAUDE.md).
`seewear-prototype.html` is the visual source of truth.

---

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Zustand · TanStack
Query · Supabase (Postgres, Auth, Storage, RLS) · react-hook-form + zod · Paymob ·
Resend · Vercel.

**Money is integer piastres everywhere** (`price_cents` = EGP × 100). Floats never
touch a price; formatting happens only at the view layer.

---

## Getting it running

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the Supabase, Paymob and Resend keys. The app degrades gracefully while they
are missing — pages render with empty states rather than crashing — but nothing is
purchasable until Supabase and Paymob are set.

Pick your own demo passwords; they are read only on the server.

### 3. Database

Link the Supabase project, push the migrations, then generate types:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
SUPABASE_PROJECT_ID=<your-project-ref> npm run db:types
```

Migrations, in order:

| File | What it does |
|---|---|
| `..._init.sql` | enums, tables, indexes, the profiles trigger, `next_order_number()` |
| `..._rls.sql` | `is_admin()` / `is_demo()` / `can_manage_store()` and every RLS policy |
| `..._functions.sql` | `apply_paid_order`, `merge_guest_cart`, `replace_cart`, `admin_dashboard_stats` |
| `..._storage.sql` | the `product-images` bucket, public read / admin write |
| `..._settings_and_discounts.sql` | store settings and discount codes |
| `..._auth_hook.sql` | `custom_access_token_hook` — puts `user_role` in the JWT |
| `..._fix_profile_column_guard.sql` | lets service-role writes set `role`/`is_demo` (the seed needs this) |
| `..._order_status_delivered.sql` | adds `confirmed` (cash on delivery) and `delivered` to `order_status` |
| `..._order_tracking.sql` | courier columns on `orders`, the `order_events` trail and the trigger that writes it |
| `..._commerce.sql` | pricing rules and per-governorate rates, cash on delivery, stock holds, expiry, refunds, invoice numbers, discount limits, addresses, reviews, stock alerts, the rate limiter |
| `..._stats_include_delivered.sql` | revenue counts card orders once paid and cash orders once delivered |

After the last one, switch the hook on in the Supabase dashboard:
**Authentication → Hooks → Customize Access Token (JWT) Claims →
`public.custom_access_token_hook`**. Middleware falls back to a `profiles` lookup
until you do, so the role gate works either way.

### 4. Seed

```bash
npm run db:photos   # checks every product/colour pair has a shot in public/products
npm run db:seed     # categories, 12 products, demo accounts, order history
```

The seed is idempotent — re-running it upserts rather than duplicating.

### 5. Run

```bash
npm run dev
```

---

## Demo accounts

The login and signup screens carry two one-tap buttons that sign the visitor into
pre-seeded accounts through server actions — the passwords never reach the browser.

- **View as demo admin** → `/dashboard`
- **View as demo customer** → `/`

Both are flagged `profiles.is_demo = true`. Demo sessions can browse and shop, but
every store mutation is refused three times over: the client toasts, the server action
returns an error, and the `can_manage_store()` RLS policy rejects the write.

---

## How money and trust flow

1. The browser sends **variant ids, quantities, the address and a payment choice**
   to `POST /api/checkout`. No price ever comes from the browser.
2. The server reads the pricing rules from `store_settings` and `shipping_rates`,
   re-reads every price and stock level, checks the discount code against its usage
   limits, and computes subtotal, shipping for the governorate, VAT and total itself
   (`features/checkout/services/api/pricing.server.ts`).
3. The order is written as `pending`, then `hold_order_stock()` takes its units out
   of stock in one transaction — all of them or none. Two shoppers racing for the
   last piece are now told at checkout, not after paying.
4. **Cash on delivery:** the order becomes `confirmed`, gets its invoice number, and
   the confirmation email goes straight away. The cash is recorded as a payment when
   the order is marked delivered.
5. **Card:** a Paymob intention is created and the customer goes to Unified Checkout.
   Paymob POSTs to `/api/paymob/webhook`; the HMAC is recomputed over the documented
   field order with SHA-512, and **a mismatch writes nothing**.
6. On success, `apply_paid_order()` flips the order to `paid` without taking stock a
   second time. It returns `false` on a replay, so a repeated callback cannot
   double-apply or double-email. The webhook and the reconciliation job share one
   code path for this, `settleTransaction`.
7. Resend sends the confirmation.

**When the callback never comes.** Three things ask Paymob directly, over its
Transaction Inquiry API, with `PAYMOB_API_KEY`:

- the redirect that brings the shopper back from Paymob;
- the **Check with Paymob** button on a pending order in the dashboard;
- `GET /api/cron/reconcile`, the scheduled sweep.

Card checkouts left unpaid for an hour are expired and their stock goes back on sale.
A payment that still arrives for an expired order completes it anyway, with a note on
the order to check stock before packing — the customer's money moved, so the order
follows it.

The browser redirect never decides anything — it only picks which page the shopper
lands on.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest: pricing, CSV, order rules, the Paymob HMAC, and every migration run against real Postgres |
| `npm run art:generate` | Regenerate the placeholder garment SVGs |
| `npm run db:push` | Apply migrations to the linked Supabase project |
| `npm run db:types` | Regenerate `src/types/database.types.ts` |
| `npm run db:check` | Verify the seed catalogue produces unique SKUs (no DB needed) |
| `npm run db:photos` | Verify every product/colour pair has exactly one photograph |
| `npm run models:manifest` | Rescan `public/models` and regenerate the 3D mesh manifest |
| `npm run db:seed` | Seed catalogue, demo accounts and order history |

> The variant upsert conflicts on `sku`, so every product/colour/size triple needs
> its own SKU. `db:check` catches a clash offline; the seed also asserts it at
> runtime and names the offenders.

---

## Imagery

| Path | Used by | Notes |
|---|---|---|
| `public/hero/hero-lineup.webp` | home hero, `/about` | 2048×1152, ~100 KB |
| `public/editorial/247.webp` | 247 editorial block, `/about` | 1600×900, ~19 KB |
| `public/editorial/outerwear.webp` | outerwear editorial block | 1600×900, ~30 KB |
| `public/products/*.webp` | every product shot | 30 files, 1200×1200, ~23–200 KB each |
| `public/garments/*.svg` | nothing any more | superseded by the photographs above |

All of it is **AI-generated** (Higgsfield, `z_image`) — the people are not real,
and these stand in for a real shoot rather than licensed stock.

**Product shots.** One per product/colour pair, square, flat-lay on a light
seamless backdrop that matches the plate they sit on, which is why `ProductShot`
runs them full bleed. The file name is `<product-slug>-<colour-slug>.webp`, built
by `productPhotoPath()` — the seed writes that path and the storefront looks the
image up by it, so a colour and its photograph cannot drift apart. Run
`npm run db:photos` to check every pair has exactly one file and no file is
orphaned; it needs no database.

To swap in real photography, keep the filenames and re-run `npm run db:seed`.

**Hero and editorial.** Each editorial block carries a `focus` value
(`objectPosition`) so the mobile crop keeps the model in shot — retune it if you
change the photograph.

> `public/garments` and `components/common/garment-art.tsx` are the old vector
> placeholders. Nothing references them now; they are kept only so the switch is
> reversible, and are safe to delete.

## 3D view

Shoppers can turn on a 3D view and spin a garment: hovering a card opens a
viewer docked to the far side of the screen, the product page swaps the
photograph for the mesh, and each bag line can be spun before checkout.

It is **opt-in and off by default**, because turning it on pulls a ~300KB WebGL
runtime plus a mesh per garment. The preference is remembered per browser
(`seewear.viewer3d`) and the toggle sits in the listing toolbar and the bag.
Auto-rotation is skipped under `prefers-reduced-motion`, and the hover preview
only arms on a device that actually has a hovering pointer — on a phone the
product page still offers the Photo/3D switch.

**Coverage is partial.** Meshes exist for four colourways:

| Mesh | Where it shows |
|---|---|
| `owners-club-hoodie-cobalt.glb` | product page, Cobalt selected |
| `down-puffer-jacket-black.glb` | card hover, product page, bag |
| `varsity-jacket-black-cream.glb` | card hover, product page, bag |
| `owners-club-cap-black.glb` | card hover, product page, bag |

Everywhere else the photograph stands and no 3D affordance is offered, so the
interface never promises a rotation it cannot do. A colourway with no mesh whose
sibling has one says so rather than silently dropping the switch.

**Adding the rest.** Meshes are lifted from the existing flat-lay photographs
(Higgsfield `sam_3_3d`, 1 credit each, so the remaining 26 colourways cost about
26). Drop the `.glb` into `public/models` named exactly like the photograph —
`<product-slug>-<colour-slug>.glb` — then:

```bash
npm run models:manifest   # rescans public/models, rejects orphans
```

That regenerates `available-models.ts`, which is what the browser reads: it
cannot stat the filesystem, and probing with a request per card would be worse
than showing nothing.

> A live render of **a model wearing the whole bag** is not built, and is not a
> matter of assets. The image depends on the combination of items, which is
> unbounded, so it cannot be generated ahead of time — it would need a fresh
> image generation on every add and remove, at roughly fifteen seconds and a
> real cost each. The feasible version is a fixed on-model shot per garment,
> shown per bag line, which is ordinary catalogue photography.

## Performance notes

**`npm run dev` is not what the site performs like.** Dev mode ships every
module unbundled and compiles each route the first time you open it. Measured on
the same machine:

| | Dev | Production |
|---|---|---|
| `/products` load | 771ms | 475ms |
| Transferred | 1,566KB | 627KB |
| Client navigation (median) | 742ms | 491ms |

The first visit to any route in dev is slower still — around 3s — because that
is when the route compiles. Use `npm run build && npm start` before judging
speed.

Two real fixes beyond that:

- **The filter rail no longer fetches from the browser.** Its categories, colour
  and size facets and price range were three round trips to Supabase at roughly
  450ms each, blocking the sidebar. The server now fetches them next to the
  first page of products and hands them over through React Query's
  `HydrationBoundary`, already warm.
- **Listing and admin tables page in SQL.** The storefront grid loads twelve at a
  time as you scroll the page; the admin tables take twenty per page with an
  exact count.
  Before, `getAdminOrders` pulled 200 rows to render a table and
  `getPaymentsSummary` computed store balances from only the newest hundred
  payments, which understated them as soon as the store passed that many.

## The 3D viewer

Shoppers can turn a garment around instead of only looking at it. It is **off
until asked for** — turning it on pulls a WebGL runtime and a mesh per piece,
which is not something to spend on someone's data uninvited. The preference
lives in `localStorage` and drives all three places at once:

| Where | What it does |
|---|---|
| Product grid | hovering a card opens a spin panel at the far edge of the screen |
| Product page | a Photo / 3D switch on the image |
| Cart | a **3D** button on any line whose colourway has a mesh |

The hover panel docks to the side the card is *not* on, so it never covers the
cards you are about to reach. One viewer is mounted at the layout rather than
one per card, because browsers cap live WebGL contexts.

**Coverage is partial.** Meshes are per product *and* colourway, named like the
photographs (`<product-slug>-<colour-slug>.glb` in `public/models`), and four of
the thirty colourways have one:

```
owners-club-hoodie-cobalt   down-puffer-jacket-black
varsity-jacket-black-cream  owners-club-cap-black
```

Everywhere else the photograph stands and the 3D affordance is simply not
offered — the product page says so when another colourway of the same piece has
a mesh. To add more, generate a GLB, drop it in `public/models` under the right
name, and run:

```bash
npm run models:manifest
```

That regenerates `available-models.ts`, which is what the browser reads: it
cannot stat the filesystem, and probing with a request per card would be worse
than showing nothing. The script refuses meshes that match no product/colour
pair.

The existing four were lifted from the flat-lay photographs with Higgsfield's
`sam_3_3d` at 1 credit each. Completing the catalogue is 26 more.

## Content and help pages

`features/content` holds the pages that are not the shop itself:

| Route | What it is |
|---|---|
| `/about` | brand story; the ids `#stores`, `#careers` and `#sustainability` are what the footer links target |
| `/help` | index of the help topics |
| `/help/shipping` | rates and delivery windows |
| `/help/returns` | return and exchange policy |
| `/help/size-guide` | garment measurements, cm/in toggle |
| `/help/contact` | contact form, plus email and phone |

Two things keep this from rotting:

- **`helpTopics` in `config/site.ts` is the only list of help pages.** The footer,
  the `/help` index, the in-page sidebar and the sitemap all read it, so a topic
  cannot appear in the navigation without a page behind it.
- **The shipping and returns figures are read from `config/constants.ts`** — the
  same constants the checkout charges from. Change the flat rate or the
  free-shipping threshold and the policy text changes with it, so the page can
  never promise something the till does not honour.

The contact form posts to a server action that sends through Resend, with the
customer set as reply-to. Without `RESEND_API_KEY` it says so plainly and points
at the support address rather than showing a success screen that sent nothing.

## Categories

`/dashboard/categories` is the only place categories are created, renamed,
reordered or removed. A category reaches four surfaces at once, so all four are
revalidated on every write: the dashboard list, the product form's picker, the
storefront filter rail and the sitemap.

Two rules the screen enforces that the database does not:

- **A category holding products cannot be deleted.** The foreign key is
  `on delete set null`, so Postgres would accept it and quietly leave those
  products uncategorised — still for sale, but absent from every category page.
  The action counts first and says what is in the way.
- **The slug is a URL.** It is offered automatically from the name while it is
  untouched, and never rewritten for an existing category, because
  `/products?category=hoodies` may already be a shared link.

The page also counts products filed under nothing and says so, since that is
invisible everywhere else.

## Order status and customer tracking

The journey is `pending → paid → fulfilled → delivered`, with `cancelled` and
`refunded` off to the side.

**Who may set what.** `ORDER_STATUS_FLOW` in `features/orders` is the single
description of the allowed moves, read by the dashboard select and checked again
in the server action. Three statuses are deliberately not in it:

| Status | Set by | Why not by hand |
|---|---|---|
| `paid` | the HMAC-verified Paymob webhook | it is also what decrements stock, so a second route would oversell |
| `refunded` | the Refund action | the money has to actually move before the label says it did |
| `cancelled` | the Cancel button, on a pending order | stopping an order is not a step forward |

**The trail.** Every status change writes a row to `order_events` — from a
trigger on `orders`, not from the dashboard, so a change made by the webhook or
by hand in SQL is logged the same way. That table is what dates the customer's
timeline; the note the admin types travels with the transition through
`orders.status_note`.

**What the customer sees.** The timeline on `/account/orders/<number>` shows each
step with the date it happened, the courier and the consignment number, and a
link straight to the courier. The shipped email carries the same three.

**Guests.** Guest orders have no `user_id`, so RLS hides them from every browser
session — right, and it used to leave guests with no way to follow a parcel.
`/track` takes an order number and the email it was placed with, looks the pair
up server-side with the service-role key, and answers identically whichever one
is wrong so the order-number sequence cannot be walked. It returns a narrower
view than the account page: where the parcel is, not the address on the label.

## Running the store

### The scheduled sweep

`GET /api/cron/reconcile` settles card orders whose Paymob callback never arrived,
rescues expired orders that turn out to have been paid, gives back stock held by
abandoned checkouts, emails back-in-stock alerts, and clears old rate-limit counters.
It refuses every request unless `CRON_SECRET` is set and sent as a bearer token.

`vercel.json` schedules it **once a day**, because that is the most the Vercel Hobby
plan allows — a more frequent schedule fails the deploy. Checkout also expires
abandoned card orders inline, so stock is never held for long either way. For a
sweep every ten minutes, pick one:

- **Vercel Pro** — change the schedule in `vercel.json` to `*/10 * * * *`.
- **Supabase pg_cron**, free on every plan. Enable the `pg_cron` and `pg_net`
  extensions, then run once in the SQL editor:

  ```sql
  select cron.schedule('seewear-reconcile', '*/10 * * * *', $
    select net.http_get(
      url := 'https://YOUR-DOMAIN/api/cron/reconcile',
      headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET')
    );
  $);
  ```

### Errors and alerts

Every uncaught server error — page, route handler or server action — goes through
`src/instrumentation.ts`, and every error screen a customer sees reports itself to
`/api/errors`. Both write one JSON log line (search Vercel logs for
`"level":"error"`) and, when `ERROR_WEBHOOK_URL` is set, post to a Slack or Discord
incoming webhook. For stack traces grouped by release, Sentry is the next step up;
it needs an account and a DSN.

Vercel Analytics and Speed Insights are installed. Both are cookieless, so they need
no consent banner, and both do nothing until the project is deployed on Vercel with
Analytics switched on in the project settings.

### Security headers

`next.config.ts` enforces HSTS, `X-Frame-Options: DENY`, `nosniff`, a referrer policy
and a permissions policy. The Content-Security-Policy ships as **Report-Only**: it
logs violations to the browser console and blocks nothing. Before enforcing it, open
a deployed build with the console open and walk through the shop, a Google sign-in,
a Paymob payment and a 3D view. Once nothing is reported, rename the header to
`Content-Security-Policy`.

### Rate limits

A fixed-window counter in Postgres (`hit_rate_limit`), because an in-memory limiter
on serverless counts per instance. Limits live together in `src/lib/rate-limit.ts`:
checkout, discount-code checks, order tracking (per address *and* per order number,
so one order cannot be walked with guessed emails), the contact form, password
resets, stock alerts, reviews and client error reports. It fails open: a database
hiccup lets a request through and logs it rather than taking checkout down.

### Backups and keys

This is a runbook, not code — none of it can be done from the repository.

- **Backups.** Supabase Pro takes a daily backup and keeps seven days. Point-in-time
  recovery is a paid add-on and is off by default; switch it on before the store
  takes real orders, because an order table restored to last night loses a day of
  sales. Test a restore once, into a branch project, before you need one.
- **Service-role key.** It bypasses every RLS policy. It lives only in Vercel's
  environment variables and a password manager — never in the repository, a chat or
  a client bundle. Rotate it in *Supabase → Project Settings → API* whenever someone
  with access leaves, then update Vercel and redeploy.
- **Paymob keys and HMAC secret.** Rotate in the Paymob dashboard. A new HMAC secret
  must reach Vercel before Paymob starts signing with it, or every callback in
  between is rejected; the reconciliation sweep recovers those orders afterwards.
- **`CRON_SECRET`** — rotate by setting a new value in Vercel (and in the pg_cron
  job, if you use one) and redeploying.

### Legal identity

The privacy policy, terms of sale and cookie page are written against what this
codebase actually does. They are a starting point, not legal advice: have them read
by an Egyptian lawyer before launch. Your commercial registration number, tax
registration number and registered address are entered once in
*Dashboard → Settings → Legal identity* and appear in the footer, the policies and
every tax invoice. Egypt's Tax Authority also runs an e-receipt system for B2C sales;
if your business is enrolled, invoices have to be submitted to it, which needs an
integration this store does not have yet.

## Layout

`src/app` holds thin route files only — each one imports a page component from its
feature. Everything real lives in `src/features/<feature>`, and features talk to each
other through their barrels: `@/features/x` is client-safe, `@/features/x/server` is
server-only. See CLAUDE.md §4.

---

## Deploying

Push to Vercel and set every variable from `.env.example` in the project settings.
Set `NEXT_PUBLIC_SITE_URL` to the real domain — Paymob's `notification_url` and
`redirection_url` are built from it, so a wrong value means callbacks never arrive.
