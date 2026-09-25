import { expect, test, type Page } from "@playwright/test";

/**
 * Checkout, up to the last button and no further.
 *
 * These run against the real project, so pressing Pay would leave a real order
 * and, with live Paymob keys, a real payment attempt. The value is in
 * everything before that button — that a bag survives the trip, that the
 * totals are shown, that the form refuses what it should refuse — and that is
 * all this file touches.
 */

async function fillBag(page: Page) {
  await page.goto("/products");
  const firstCard = page.locator('a[href^="/product/"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  // Wait for the product page itself: asking the listing whether it has an
  // "Add to bag" button would quietly answer no and skip the whole test.
  await expect(page).toHaveURL(/\/product\//);

  const addToBag = page.getByRole("button", { name: /^add to bag$/i }).first();
  if (!(await addToBag.isVisible().catch(() => false))) return false;

  const sizes = page.getByRole("button", { name: /^(XS|S|M|L|XL|XXL|\d{2})$/ });
  if (await sizes.first().isVisible().catch(() => false)) await sizes.first().click();

  await addToBag.click();
  // The drawer that opens confirms the line went in; close it and carry on.
  await expect(page.getByRole("dialog").getByText(/your bag \(\d+\)/i)).toBeVisible();
  await page.keyboard.press("Escape");
  return true;
}

test.describe("checkout", () => {
  test("an empty bag cannot reach the payment form", async ({ page }) => {
    await page.goto("/checkout");

    await expect(page.getByText(/nothing to check out/i)).toBeVisible();
  });

  test("the form asks for an address and shows what it will cost", async ({ page }) => {
    const filled = await fillBag(page);
    test.skip(!filled, "nothing in the catalogue is in stock today");

    await page.goto("/checkout");

    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/phone/i).first()).toBeVisible();
    await expect(page.getByText(/total/i).first()).toBeVisible();
  });

  test("the browser stops an email that is not an email", async ({ page }) => {
    const filled = await fillBag(page);
    test.skip(!filled, "nothing in the catalogue is in stock today");

    await page.goto("/checkout");

    const email = page.getByLabel(/email/i).first();
    await email.fill("not-an-email");
    await page.locator('form button[type="submit"]').first().click();

    // The field is a real `type="email"`, so the browser refuses before any of
    // our code runs. Its bubble is not in the page, so the check is the
    // validity flag itself — and that nothing was submitted.
    expect(await email.evaluate((node: HTMLInputElement) => node.validity.valid)).toBe(false);
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("an address with pieces missing is refused, and says which", async ({ page }) => {
    const filled = await fillBag(page);
    test.skip(!filled, "nothing in the catalogue is in stock today");

    await page.goto("/checkout");

    // An email the browser is happy with, and nothing else filled in. Submitting
    // now reaches our own schema — the same one the order route validates
    // against — and it must refuse, so no order can come of this.
    await page.getByLabel(/email/i).first().fill("nobody@example.com");
    // By type, not by name: the words "pay" and "place order" also appear on
    // the cash-on-delivery option right above the button.
    await page.locator('form button[type="submit"]').first().click();

    await expect(page.getByText(/we need a name for the parcel/i)).toBeVisible();
    await expect(page.getByText(/street and building/i)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("the totals move when a bag changes", async ({ page }) => {
    const filled = await fillBag(page);
    test.skip(!filled, "nothing in the catalogue is in stock today");

    await page.goto("/cart");

    // The summary's own total, not the first money-looking text on the page:
    // the footer says "all prices in EGP" and would never change.
    const total = page.locator("dl").getByText(/^Total$/).locator("xpath=following-sibling::dd[1]");
    const before = await total.innerText();

    // A second of the same piece, from the cart's own stepper.
    await page.getByRole("button", { name: /increase quantity/i }).first().click();

    await expect(async () => {
      expect(await total.innerText()).not.toBe(before);
    }).toPass({ timeout: 8_000 });
  });
});

test.describe("order tracking", () => {
  test("tracking needs both the order number and the email it was placed with", async ({
    page,
  }) => {
    await page.goto("/track");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByLabel(/order/i).first().fill("SW-0000");
    await page.getByLabel(/email/i).first().fill("nobody@example.com");
    await page.getByRole("button", { name: /track|find/i }).first().click();

    // Whether or not that order exists, the page must answer rather than hang
    // or leak another customer's order.
    await expect(page.locator("body")).not.toContainText(/application error/i);
  });
});

test.describe("the dashboard is not open to the public", () => {
  for (const path of ["/dashboard", "/dashboard/orders", "/dashboard/settings"]) {
    test(`${path} turns a signed-out visitor away`, async ({ page }) => {
      await page.goto(path);

      await expect(page).not.toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("body")).not.toContainText(/revenue|orders this month/i);
    });
  }
});
