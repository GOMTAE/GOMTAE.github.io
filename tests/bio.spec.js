import { test, expect } from "@playwright/test";

test("homepage links to a biography with reusable short and longer text", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".hero")
    .getByRole("link", { name: "Bio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/bio\/$/);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  for (const id of ["short-bio", "long-bio"]) {
    const paragraphs = await page.locator(`#${id} p`).allTextContents();
    await page.locator(`[data-copy-bio="${id}"]`).click();
    await expect(page.locator(`[data-bio-status="${id}"]`)).toHaveText(
      "Bio copied.",
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      paragraphs.join("\n\n"),
    );
  }
});

test("biographies remain readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/bio/");
  await expect(page.locator("#short-bio")).toContainText("Taehyoung Kim");
  await expect(page.locator("#long-bio")).toBeVisible();
  await expect(page.locator("[data-copy-bio]:visible")).toHaveCount(0);
  await context.close();
});
