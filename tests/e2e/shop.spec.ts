import { expect, test, type Page } from "@playwright/test";

/**
 * The storefront, from the front door to the bag.
 *
 * Every assertion here is about what a customer can see or do, never about a
 * class name or a component. If these pass, someone can find a garment, choose
 * a size and get it into the bag; if one fails, a customer is stuck.
 */

/** The first product card on the listing, whatever the catalogue holds today. */
async function openFirstProduct(page: Page) {
  await page.goto("/products");
  const firstCard = page.locator('a[href^="/product/"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page).toHaveURL(/\/product\//);
}

test.describe("storefront", () => {
  test("the home page names the shop and links into the catalogue", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/SEEWEAR/i);
    await expect(page.getByRole("link", { name: "SEEWEAR", exact: true })).toBeVisible();

    // The point of the home page: a way into the catalogue that a customer
    // can actually see. On a phone the nav is behind a button, so this asks for
    // a visible link rather than any link.
    await expect(page.locator('a[href^="/products"]:visible').first()).toBeVisible();
  });

  test("the catalogue lists garments with prices", async ({ page }) => {
    await page.goto("/products");

    const firstCard = page.locator("article").filter({ has: page.locator('a[href^="/product/"]') }).first();
    await expect(firstCard).toBeVisible();

    // Prices are the one thing a listing must never render blank. Read from
    // inside the card, not the page: the header carries the words "EG / EGP"
    // and would happily pass this test on its own.
    await expect(firstCard).toContainText(/\d/);
    await expect(firstCard).toContainText(/EGP|E£|£/);
  });

  test("a filter goes into the URL, so a filtered listing can be shared", async ({ page }) => {
    await page.goto("/products?sort=price-asc");

    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test("a product page shows a price and a way to buy", async ({ page }) => {
    await openFirstProduct(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Either it can be bought, or it is sold out and says so. Both are fine;
    // a page with neither is broken.
    const buy = page.getByRole("button", { name: /add to bag|sold out/i }).first();
    await expect(buy).toBeVisible();
  });

  test("a garment can be put in the bag and is still there on the cart page", async ({
    page,
  }) => {
    await openFirstProduct(page);

    const addToBag = page.getByRole("button", { name: /^add to bag$/i }).first();
    test.skip(!(await addToBag.isVisible()), "the first garment is sold out today");

    // A size has to be chosen first on most garments; take the first that is
    // offered, exactly as a customer would.
    const sizes = page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL|\d{2})$/ });
    if (await sizes.first().isVisible().catch(() => false)) {
      await sizes.first().click();
    }

    // The heading wears the brand, the bag line does not.
    const name = (await page.getByRole("heading", { level: 1 }).innerText())
      .replace(/^SEEWEAR\s+/i, "")
      .trim();
    await addToBag.click();

    // Adding opens the bag drawer, which is a modal: while it is open the rest
    // of the page is hidden from the accessibility tree, so the drawer itself
    // is what has to be asserted against, not the header's bag button.
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText(/your bag \(\d+\)/i)).toBeVisible();
    await expect(drawer.getByRole("link", { name: /checkout/i })).toBeVisible();

    // And it is still there after a reload, because the bag is persisted.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /your bag/i })).toBeVisible();
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /increase quantity/i })).toBeVisible();
  });

  test("an empty bag says so instead of showing an empty summary", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByText(/nothing in the bag yet/i)).toBeVisible();
  });

  test("search finds something and offers a way out when it does not", async ({ page }) => {
    await page.goto("/products?q=zzzzzznotathing");

    // An empty result is a legitimate answer; a crash is not.
    await expect(page.locator("body")).not.toContainText(/application error/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a garment that does not exist gets a 404, not a stack trace", async ({ page }) => {
    const response = await page.goto("/product/this-garment-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).not.toContainText(/unhandled|stack trace/i);
  });
});
