/**
 * REGRESSION: Product edit form stability
 *
 * Root cause fixed: createClient() called at render level caused unstable
 * useCallback deps, re-triggering loadData on every keystroke, which reset
 * form state from DB and could navigate to /login mid-editing.
 *
 * These tests lock the correct behavior: typing slowly does NOT reset the form.
 */

import { test, expect } from "@playwright/test";
import { loginAsMerchant, hasAuthCredentials } from "./helpers/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Product edit form stability", () => {
  test.beforeEach(() => {
    if (!hasAuthCredentials()) {
      test.skip();
    }
  });

  test("typing description slowly does NOT reset the form", async ({
    page,
  }) => {
    await loginAsMerchant(page);

    // Navigate to products list
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Click the first edit link (or go directly via URL if we know the product ID)
    const editLinks = page.locator('a[href*="/edit"]');
    const count = await editLinks.count();
    if (count === 0) {
      test.skip(); // No products to edit
      return;
    }
    await editLinks.first().click();
    await page.waitForURL(/\/edit$/);

    // Wait for the form to load
    const form = page.getByTestId("edit-product-form");
    await expect(form).toBeVisible({ timeout: 10_000 });

    const descField = page.getByTestId("product-description");
    await expect(descField).toBeVisible();

    // Clear and type a long description slowly, character by character
    await descField.fill("");
    const testText = "This is a carefully typed product description for testing form stability.";

    for (const char of testText) {
      await descField.pressSequentially(char, { delay: 50 });
    }

    // After all typing, the field must still contain exactly what we typed
    await expect(descField).toHaveValue(testText);

    // Page must still be on the edit URL (no navigation to /login or /dashboard/products)
    await expect(page).toHaveURL(/\/edit$/);

    // No blank/error screen
    const errorBoundary = page.getByTestId("edit-product-error");
    await expect(errorBoundary).not.toBeVisible();
  });

  test("typing, pausing, and continuing does not lose input", async ({
    page,
  }) => {
    await loginAsMerchant(page);
    await page.goto(`${BASE_URL}/dashboard/products`);

    const editLinks = page.locator('a[href*="/edit"]');
    if ((await editLinks.count()) === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    await page.waitForURL(/\/edit$/);

    const descField = page.getByTestId("product-description");
    await expect(descField).toBeVisible({ timeout: 10_000 });

    await descField.fill("");
    await descField.pressSequentially("First part", { delay: 40 });

    // Pause for 2 seconds (simulates user thinking / slow typing)
    await page.waitForTimeout(2000);

    await descField.pressSequentially(" second part", { delay: 40 });

    // Verify complete text is preserved
    await expect(descField).toHaveValue("First part second part");
    await expect(page).toHaveURL(/\/edit$/);
  });

  test("saving edited description persists after page refresh", async ({
    page,
  }) => {
    await loginAsMerchant(page);
    await page.goto(`${BASE_URL}/dashboard/products`);

    const editLinks = page.locator('a[href*="/edit"]');
    if ((await editLinks.count()) === 0) {
      test.skip();
      return;
    }

    const firstEditHref = await editLinks.first().getAttribute("href");
    await editLinks.first().click();
    await page.waitForURL(/\/edit$/);

    const descField = page.getByTestId("product-description");
    await expect(descField).toBeVisible({ timeout: 10_000 });

    const uniqueDescription = `Test description ${Date.now()}`;
    await descField.fill(uniqueDescription);

    // Submit the form
    const saveBtn = page.getByTestId("save-product-btn");
    await saveBtn.click();

    // Should redirect to products list
    await page.waitForURL(/\/dashboard\/products$/);

    // Navigate back to the same edit page
    if (firstEditHref) {
      await page.goto(`${BASE_URL}${firstEditHref}`);
      await page.waitForURL(/\/edit$/);
      const descFieldAgain = page.getByTestId("product-description");
      await expect(descFieldAgain).toBeVisible({ timeout: 10_000 });
      await expect(descFieldAgain).toHaveValue(uniqueDescription);
    }
  });

  test("form does not navigate to /login while typing", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto(`${BASE_URL}/dashboard/products`);

    const editLinks = page.locator('a[href*="/edit"]');
    if ((await editLinks.count()) === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    await page.waitForURL(/\/edit$/);

    const descField = page.getByTestId("product-description");
    await expect(descField).toBeVisible({ timeout: 10_000 });

    // Type continuously for several seconds
    await descField.fill("");
    for (let i = 0; i < 5; i++) {
      await descField.pressSequentially(`Word${i} `, { delay: 30 });
      await page.waitForTimeout(200);
    }

    // Must still be on edit page, not logged out
    await expect(page).not.toHaveURL(/login/);
    await expect(page).toHaveURL(/\/edit$/);
  });
});

test.describe("Product create form stability", () => {
  test.beforeEach(() => {
    if (!hasAuthCredentials()) {
      test.skip();
    }
  });

  test("can create a product successfully", async ({ page }) => {
    await loginAsMerchant(page);
    await page.goto(`${BASE_URL}/dashboard/products/new`);

    await page.fill("#name", `Test Product ${Date.now()}`);
    await page.fill("#price", "49.99");
    await page.fill("#description", "A test product description");

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard\/products$/);
  });
});
