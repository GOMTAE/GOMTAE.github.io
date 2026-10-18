import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/projects.html",
  "/publications.html",
  "/writing.html",
  "/work.html",
  "/404.html",
];
for (const route of routes) {
  test(`${route} is accessible, complete and responsive`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (
        response.url().startsWith("http://127.0.0.1") &&
        response.status() >= 400
      )
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("#main")).toBeVisible();
    // Scroll the actual page so the browser fetches all lazy scientific figures.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 650) {
        scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images]
            .filter((img) => img.getClientRects().length)
            .every((img) => img.complete && img.naturalWidth > 0),
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(
        `${route.replaceAll("/", "").replace(".html", "") || "home"}.png`,
      ),
      fullPage: true,
    });
  });
}

test("mobile navigation opens, follows links, and closes with Escape", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Writing", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Writing", exact: true })
    .click();
  await expect(page).toHaveURL(/writing\.html$/);
});

test("publications filter accurately and citations are usable", async ({
  page,
}) => {
  await page.goto("/publications.html");
  await expect(page.locator("[data-publication]:visible")).toHaveCount(5);
  await page.getByRole("button", { name: "Conference" }).click();
  await expect(page.locator("[data-publication]:visible")).toHaveCount(1);
  await expect(page.locator("#ssp")).toBeVisible();
  await page.getByRole("button", { name: "Preprints" }).click();
  await expect(page.locator("[data-publication]:visible")).toHaveCount(4);
  await page.getByRole("button", { name: "All", exact: false }).click();
  const multifly = page.locator("#multifly");
  await multifly.getByRole("link", { name: "BibTeX" }).click();
  await expect(multifly.locator("details")).toHaveAttribute("open", "");
  await expect(multifly.locator("code")).toContainText(
    "Markus Gross and Andreas Greiner and Taehyoung Kim",
  );
  await expect(multifly.locator(".authors")).toContainText("Daniel Cremers");
  await expect(
    multifly.getByRole("link", { name: "Code", exact: true }),
  ).toHaveCount(0);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await multifly.getByRole("button", { name: "Copy citation" }).click();
  await expect(multifly.getByRole("status")).toHaveText("Citation copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "2610.10359",
  );
});

test("homepage delays heavy media until explicitly requested", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  expect(requests.some((url) => /\.mp4|\.gif|\.gz|three/i.test(url))).toBe(
    false,
  );
  await page
    .getByRole("link", {
      name: "See perception in motion: play SSP segmentation comparison video",
    })
    .click();
  await expect(page.locator("video")).toBeVisible();
  await expect
    .poll(() => page.locator("video").evaluate((video) => video.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(requests.some((url) => url.endsWith("ssp_banner_video.mp4"))).toBe(
    true,
  );
});

test("content and navigation remain usable without JavaScript", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "See perception in motion: play SSP segmentation comparison video",
    }),
  ).toHaveAttribute("href", /\.mp4$/);
  await page.goto("/publications.html");
  await expect(page.locator("[data-publication]")).toHaveCount(5);
  await page.locator("#cite-multifly summary").click();
  await expect(page.locator("#cite-multifly code")).toBeVisible();
  await context.close();
});

test("reduced motion disables animated navigation and no fake posts are shown", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/writing.html");
  await expect(
    page.getByText("There are no posts yet.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  expect((await page.request.get("/feed.xml")).status()).toBe(200);
  expect(await (await page.request.get("/feed.xml")).text()).not.toContain(
    "<item>",
  );
  expect((await page.request.get("/src/posts/private.md")).status()).toBe(404);
  expect(
    (await page.request.get("/reference/private-report.pdf")).status(),
  ).toBe(404);
});
