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
  await expect(
    page.getByText("Shops, vendors, food sellers, salons, service providers", {
      exact: false,
    }).first()
  ).toBeVisible();
  await expect(
    page.getByText("No commission. Local payments. WhatsApp orders.")
  ).toBeVisible();
  await expect(
    page.getByText("Automated WhatsApp updates", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create Free Store" }).first()
  ).toBeVisible();
});
