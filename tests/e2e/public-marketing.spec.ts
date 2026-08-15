import { expect, test } from "@playwright/test";

test("homepage positions OshiCart for the wider Namibian seller market", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Your Namibian business, online in minutes.",
    })
  ).toBeVisible();
  // The "wider seller market" claim used to be checked against a sentence of
  // marketing prose, which was rewritten out of the page. The SellAnything
  // section heading and its mode cards carry the same claim but track the
  // platform's actual item types (product / service / rental), so they only
  // change when the product does.
  await expect(
    page.getByRole("heading", {
      name: "Whatever you sell, OshiCart speaks its language.",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Services & bookings" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rentals & hire" })
  ).toBeVisible();
  // Same rot as above: both of these were sentences that no longer exist. The
  // payments section heading and the feature card carry the zero-commission
  // and WhatsApp-automation claims, and are named after shipped capabilities
  // rather than a tagline.
  await expect(
    page.getByRole("heading", { name: "Accept the ways Namibians already pay." })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Automated WhatsApp replies" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create Free Store" }).first()
  ).toBeVisible();
});
