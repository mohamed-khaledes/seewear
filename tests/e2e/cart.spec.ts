import { expect, test, type Page } from "@playwright/test";

/**
 * The bag, across reloads and across sign-in.
 *
 * These exist because of a real fault: a signed-in customer's bag was merged
 * into their saved bag on *every* page load, so one jacket became two, then
 * four, then eight — and anything removed came back on the next visit. The
 * tests below are the shape of that bug, so it cannot return quietly.
 *
 * They sign into the shared demo customer and write to its saved bag, so they
 * run one at a time, on one browser, and each leaves the bag empty behind it.
 */

const KEY = "seewear.cart";

test.describe.configure({ mode: "serial" });

type Stored = {
  version?: number;
  state: { items: { variantId: string; quantity: number }[]; ownerId?: string | null };
};

async function readBag(page: Page): Promise<Stored["state"]> {
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), KEY);
  return raw ? (JSON.parse(raw) as Stored).state : { items: [] };
}

/** Puts the first garment that is in stock into the bag. */
async function addFirstInStock(page: Page): Promise<boolean> {
  await page.goto("/products");
  await page.locator('a[href^="/product/"]').first().click();
  await expect(page).toHaveURL(/\/product\//);

  const sizes = page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL|\d{2})$/ });
  if (await sizes.first().isVisible().catch(() => false)) await sizes.first().click();

  const addToBag = page.getByRole("button", { name: /^add to bag$/i }).first();
  if (!(await addToBag.isVisible().catch(() => false))) return false;

  await addToBag.click();
  await expect.poll(async () => (await readBag(page)).items.length).toBe(1);
  return true;
}

async function signInAsDemoCustomer(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /demo customer/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });

  // The bag is stamped with the account once the one exchange has settled.
  // Waiting for that stamp is what makes everything after this deterministic.
  await expect
    .poll(async () => (await readBag(page)).ownerId ?? null, { timeout: 15_000 })
    .not.toBeNull();
}

/** Signs in and leaves the account's saved bag empty, so a test starts level. */
async function signInWithEmptyBag(page: Page) {
  await signInAsDemoCustomer(page);
  await emptyBag(page);
}

/** Empties the bag through the UI and waits for the saved copy to catch up. */
async function emptyBag(page: Page) {
  if ((await readBag(page)).items.length === 0) return;

  await page.goto("/cart");
  const remove = page.getByRole("button", { name: /^remove/i });
  // The page shows a skeleton until the persisted bag has been read, so the
  // rows have to be on screen before they can be counted.
  await expect(remove.first()).toBeVisible();

  for (let guard = 0; guard < 20; guard += 1) {
    const n = await remove.count();
    if (n === 0) break;
    await remove.first().click();
    await expect.poll(() => remove.count()).toBe(n - 1);
  }

  await expect.poll(async () => (await readBag(page)).items.length).toBe(0);
  // The push up is debounced; give it room so the next test starts clean.
  await page.waitForTimeout(1500);
}

test.describe("the bag", () => {
  // One browser only: these share the demo customer's saved bag.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one browser is enough for shared state");
  });

  test("a guest's bag survives a reload, minus what was removed", async ({ page }) => {
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^remove/i }).first().click();
    await expect.poll(async () => (await readBag(page)).items.length).toBe(0);

    await page.goto("/");
    await expect.poll(async () => (await readBag(page)).items.length).toBe(0);
  });

  test("a signed-in bag holds its quantity across reloads", async ({ page }) => {
    await signInWithEmptyBag(page);
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");

    const { items } = await readBag(page);
    expect(items[0]?.quantity).toBe(1);

    // The regression: each visit used to merge the saved bag into itself.
    for (let visit = 1; visit <= 2; visit += 1) {
      await page.goto("/");
      await page.waitForTimeout(1200);
      const bag = await readBag(page);
      expect(bag.items).toHaveLength(1);
      expect(bag.items[0]?.quantity).toBe(1);
    }

    await emptyBag(page);
  });

  test("a line removed while signed in does not come back", async ({ page }) => {
    await signInWithEmptyBag(page);
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");

    await emptyBag(page);

    await page.goto("/");
    await page.waitForTimeout(1200);
    expect((await readBag(page)).items).toHaveLength(0);
  });

  test("a guest's bag follows them into their account", async ({ page }) => {
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");

    const guest = await readBag(page);
    expect(guest.ownerId ?? null).toBeNull();

    await signInAsDemoCustomer(page);
    await page.waitForTimeout(1500);

    const merged = await readBag(page);
    expect(merged.items.map((i) => i.variantId)).toContain(guest.items[0]!.variantId);
    expect(merged.ownerId).not.toBeNull();

    await emptyBag(page);
  });

  test("a bag saved before owners were recorded is not counted twice", async ({ page }) => {
    await signInWithEmptyBag(page);
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");
    await page.waitForTimeout(1500); // let it reach the account's saved bag

    // Rewrite what is in the browser as a pre-fix cart: the quantity is right,
    // but nothing records whose bag it is. The old code merged this into the
    // saved copy of itself.
    const before = await readBag(page);
    await page.evaluate(
      ([k, payload]) => window.localStorage.setItem(k!, payload!),
      [KEY, JSON.stringify({ version: 1, state: { items: before.items } })] as const,
    );

    await page.goto("/");
    await page.waitForTimeout(1500);

    const after = await readBag(page);
    expect(after.items).toHaveLength(before.items.length);
    expect(after.items[0]?.quantity).toBe(before.items[0]?.quantity);

    await emptyBag(page);
  });

  test("signing out does not leave the bag for the next visitor", async ({ page }) => {
    await signInWithEmptyBag(page);
    test.skip(!(await addFirstInStock(page)), "nothing in the catalogue is in stock today");

    await page.goto("/");
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect.poll(async () => (await readBag(page)).items.length, {
      timeout: 15_000,
    }).toBe(0);

    // And it is still waiting in the account.
    await signInAsDemoCustomer(page);
    await expect.poll(async () => (await readBag(page)).items.length, {
      timeout: 15_000,
    }).toBe(1);

    await emptyBag(page);
  });
});
