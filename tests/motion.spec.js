import { test, expect } from "@playwright/test";

test("scrolling away during a slow initial load does not disable later autoplay", async ({
  page,
}) => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/archive-control-loop.mp4", async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto("/projects.html#archive");
  const card = page.locator(".archive-card").first();
  const video = card.locator("video");
  await card.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("src", /archive-control-loop.mp4$/);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  release();
  await card.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
    .toBe(true);
});

test("archived GIF-derived demos play inline, pause on request and stop offscreen", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/projects.html#archive");
  const videos = page.locator(".archive-preview video");
  await expect(videos).toHaveCount(4);
  const card = page.locator(".archive-card").first();
  await card.scrollIntoViewIfNeeded();
  const video = videos.first();
  await expect
    .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
    .toBe(true);
  const start = await video.evaluate((v) => v.currentTime);
  await expect
    .poll(() => video.evaluate((v) => v.currentTime))
    .toBeGreaterThan(start + 0.2);
  expect(requests.some((url) => /\.gif($|\?)/i.test(url))).toBe(false);
  await card
    .getByRole("button", {
      name: "Pause animation: Fault-tolerant quadrotor control",
    })
    .click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  const pausedTime = await video.evaluate((v) => v.currentTime);
  await page.waitForTimeout(300);
  expect(await video.evaluate((v) => v.currentTime)).toBe(pausedTime);
  await page.evaluate(() => scrollTo(0, 0));
  await card.scrollIntoViewIfNeeded();
  await expect(
    card.getByRole("button", {
      name: "Play animation: Fault-tolerant quadrotor control",
    }),
  ).toBeVisible();
  await card
    .getByRole("button", {
      name: "Play animation: Fault-tolerant quadrotor control",
    })
    .click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(false);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
});

test("reduced motion keeps static frames until the visitor explicitly plays", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects.html#archive");
  const card = page.locator(".archive-card").first();
  await card.scrollIntoViewIfNeeded();
  const video = card.locator("video");
  await expect(video).not.toHaveAttribute("src");
  await expect(card.locator("[data-loop-shell]")).not.toHaveClass(
    /motion-ready/,
  );
  await card
    .getByRole("button", {
      name: "Play animation: Fault-tolerant quadrotor control",
    })
    .click();
  await expect
    .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
    .toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
});

test("save-data preference prevents automatic animation downloads", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, addEventListener() {} },
    }),
  );
  await page.goto("/");
  const video = page.locator(".hero [data-loop-src]");
  await expect(video).not.toHaveAttribute("src");
  await page
    .getByRole("button", { name: "Play animation: KD-SSP aerial perception" })
    .click();
  await expect
    .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
    .toBe(true);
});

test("a failed loop retains its still without an original GIF link", async ({
  page,
}) => {
  await page.route("**/archive-control-loop.mp4", (route) => route.abort());
  await page.goto("/projects.html#archive");
  const card = page.locator(".archive-card").first();
  await card.scrollIntoViewIfNeeded();
  await expect
    .poll(() => card.locator("video").evaluate((v) => Boolean(v.error)))
    .toBe(true);
  await expect(card.locator("[data-loop-shell]")).not.toHaveClass(
    /motion-ready/,
  );
  await expect(card.getByRole("button")).toBeHidden();
  await expect(
    card.getByRole("link", { name: "View original GIF" }),
  ).toHaveCount(0);
});
