/**
 * Cart and checkout critical path
 *
 * Covers: add to cart, quantity updates, checkout submit, WhatsApp handoff URL.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const TEST_SLUG = process.env.TEST_STORE_SLUG || "test-store";

test.describe("Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/s/${TEST_SLUG}`);
    // Skip if store not found
    const notFound = page.getByTestId("store-not-found");
    const isNotFound = await notFound.isVisible().catch(() => false);
    if (isNotFound) {
      test.skip();
    }
  });

  test("can add a product to the cart", async ({ page }) => {
    // Click first "Add to Cart" button
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // Cart badge should show count > 0
    const cartBtn = page.locator('button[aria-label="Open cart"]');
    await expect(cartBtn).toBeVisible();
    const badge = cartBtn.locator("span").filter({ hasText: /\d/ });
    await expect(badge).toBeVisible();
    const badgeText = await badge.innerText();
    expect(parseInt(badgeText)).toBeGreaterThan(0);
  });

  test("cart drawer opens and shows item", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // Open cart drawer
    await page.locator('button[aria-label="Open cart"]').click();

    // Drawer should show the item
    await expect(page.locator('h2:has-text("Cart")')).toBeVisible();
    const items = page.locator("ul li");
    await expect(items.first()).toBeVisible();
  });

  test("quantity can be increased and decreased", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await addBtn.click();
    await page.locator('button[aria-label="Open cart"]').click();

    // Increase quantity
    const increaseBtn = page.locator('button[aria-label="Increase quantity"]').first();
    await increaseBtn.click();

    const qty = page.locator("span.text-sm.font-medium.w-6").first();
    await expect(qty).toHaveText("2");

    // Decrease quantity
    const decreaseBtn = page.locator('button[aria-label="Decrease quantity"]').first();
    await decreaseBtn.click();
    await expect(qty).toHaveText("1");
  });

  test("checkout button navigates to checkout page", async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await addBtn.click();
    await page.locator('button[aria-label="Open cart"]').click();

    const checkoutBtn = page.locator('button:has-text("Checkout")');
    await checkoutBtn.click();

    await expect(page).toHaveURL(new RegExp(`/checkout/${TEST_SLUG}`));
  });
});

test.describe("Checkout", () => {
  test.beforeEach(async ({ page }) => {
    // Add item to cart via localStorage, then navigate to checkout
    await page.goto(`${BASE_URL}/s/${TEST_SLUG}`);
    const notFound = page.getByTestId("store-not-found");
    const isNotFound = await notFound.isVisible().catch(() => false);
    if (isNotFound) {
      test.skip();
      return;
    }

    // Add a product to cart
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
  });

  test("checkout page loads with cart items", async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/${TEST_SLUG}`);

    // Should show order summary with items
    await expect(page.locator('h2:has-text("Order Summary")')).toBeVisible();
    // Should not show "cart is empty"
    await expect(page.locator("text=Your cart is empty")).not.toBeVisible();
  });

  test("checkout form validates required fields", async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/${TEST_SLUG}`);

    // Fill name but provide a too-short phone (length < 8) to trigger JS
    // validation without hitting the browser's HTML5 required popup.
    await page.fill('input[placeholder="Your full name"]', "Test Customer");
    await page.fill('input[placeholder="+264 81 123 4567"]', "1");

    const submitBtn = page.locator('button:has-text("Place Order")');
    await submitBtn.click();

    // JS validation error div should appear (bg-red-50 / text-red-700)
    await expect(page.locator('[class*="red-50"]').first()).toBeVisible();
  });

  test("successful checkout shows WhatsApp handoff button", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/checkout/${TEST_SLUG}`);

    // Fill required fields
    await page.fill('input[placeholder="Your full name"]', "Test Customer");
    await page.fill('input[placeholder="+264 81 123 4567"]', "+264811234567");

    // Select pickup method (it's already default)
    const submitBtn = page.locator('button:has-text("Place Order")');
    await submitBtn.click();

    // On success, the WhatsApp button should appear
    await expect(
      page.locator('a:has-text("Message") >> [href*="wa.me"]')
        .or(page.locator('a[href*="wa.me"]'))
    ).toBeVisible({ timeout: 15_000 });

    // The WhatsApp URL must include the merchant's number and order details
    const waLink = page.locator('a[href*="wa.me"]').first();
    const href = await waLink.getAttribute("href");
    expect(href).toMatch(/wa\.me\/\d+/);
    expect(href).toContain("order");
  });

  test("cart is cleared from localStorage after successful checkout", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/checkout/${TEST_SLUG}`);

    await page.fill('input[placeholder="Your full name"]', "Test Customer");
    await page.fill('input[placeholder="+264 81 123 4567"]', "+264811234567");
    await page.locator('button:has-text("Place Order")').click();

    // Wait for success state
    await expect(page.locator('a[href*="wa.me"]')).toBeVisible({
      timeout: 15_000,
    });

    // Cart in localStorage should be cleared
    const cartData = await page.evaluate(
      (slug) => localStorage.getItem(`oshicart-cart-${slug}`),
      TEST_SLUG
    );
    // Either null or empty array
    const parsed = cartData ? JSON.parse(cartData) : [];
    expect(parsed).toHaveLength(0);
  });
});
