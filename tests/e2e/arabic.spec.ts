import { expect, test } from "@playwright/test";

/**
 * The Arabic storefront.
 *
 * Three things have to hold, and each has its own way of going quietly wrong:
 * the page has to face right to left, the language has to survive a click onto
 * a link written without a prefix, and English has to stay English for someone
 * who never asked for Arabic.
 */

test.describe("Arabic", () => {
  test("/ar renders right to left, in Arabic", async ({ page }) => {
    await page.goto("/ar");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    // The nav, which is the first thing anyone reads.
    await expect(page.getByRole("link", { name: "تسوّق" }).first()).toBeVisible();
  });

  test("the language survives a link that carries no prefix", async ({ page }) => {
    await page.goto("/ar");

    // Nearly every link in the app is written without a prefix. The cookie the
    // middleware sets is what keeps those links Arabic.
    await page.goto("/products");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/[؀-ۿ]/);
  });

  test("the bag works in Arabic and shows Arabic words", async ({ page }) => {
    await page.goto("/ar/products");

    const firstCard = page.locator('a[href^="/product/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/product\//);

    const addToBag = page.getByRole("button", { name: "أضف إلى الحقيبة" }).first();
    test.skip(!(await addToBag.isVisible().catch(() => false)), "sold out today");

    const sizes = page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL|\d{2})$/ });
    if (await sizes.first().isVisible().catch(() => false)) await sizes.first().click();

    await addToBag.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText(/حقيبتك/)).toBeVisible();
    await expect(drawer.getByRole("link", { name: /إتمام الشراء/ })).toBeVisible();
  });

  test("a crawler with no cookie gets English at an English URL", async ({ browser }) => {
    // A fresh context: no cookie, exactly as a search engine arrives.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/products");

    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await context.close();
  });

  test("each page points a search engine at its other language", async ({ page }) => {
    await page.goto("/ar/products");

    const alternates = page.locator('link[rel="alternate"]');
    await expect(alternates).toHaveCount(3); // en, ar, x-default

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/ar\/products$/,
    );
  });

  test("the switcher changes language and stays on the same page", async ({ page }) => {
    await page.goto("/products?sort=price-asc");

    await page.getByRole("button", { name: /العربية|Arabic/ }).first().click();

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    // Same page, same filter: switching language must not cost a shopper the
    // listing they had narrowed down.
    await expect(page).toHaveURL(/\/ar\/products\?sort=price-asc/);
  });
});
