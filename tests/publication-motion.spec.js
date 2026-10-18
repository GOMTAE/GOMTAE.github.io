import { test, expect } from "@playwright/test";

for (const route of ["/", "/projects.html", "/publications.html"]) {
  test(`publication previews play without visible controls on ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    for (const id of [
      "multifly",
      "voxelfix",
      "missionbench",
      "flexpath",
      "ssp",
    ]) {
      const video = page.locator(`video[data-loop-src$="/${id}-preview.mp4"]`);
      await expect(video).toHaveCount(1);
      await video.scrollIntoViewIfNeeded();
      await expect
        .poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0))
        .toBe(true);
      expect(await video.evaluate((v) => v.duration)).toBeLessThanOrEqual(15.1);
      const shell = video.locator("..");
      await expect(shell.getByRole("button")).toHaveCount(0);
      const frame = await video.evaluate((v) => v.currentTime);
      await expect
        .poll(() => video.evaluate((v) => v.currentTime))
        .toBeGreaterThan(frame + 0.1);
      expect(await video.evaluate((v) => !!v.closest("a"))).toBe(false);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("publication animations keep their stills with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/publications.html");
  for (const id of [
    "multifly",
    "voxelfix",
    "missionbench",
    "flexpath",
    "ssp",
  ]) {
    const video = page.locator(`video[data-loop-src$="/${id}-preview.mp4"]`);
    await video.scrollIntoViewIfNeeded();
    await expect(video).not.toHaveAttribute("src");
    await expect(video.locator("..").locator("img")).toBeVisible();
  }
});

test("publication previews share one frame ratio and research rows align", async ({
  page,
}) => {
  await page.goto("/publications.html");
  const frames = await page
    .locator(".publication-thumbnail")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        width: n.getBoundingClientRect().width,
        height: n.getBoundingClientRect().height,
      })),
    );
  expect(frames).toHaveLength(5);
  for (const frame of frames)
    expect(Math.abs(frame.width / frame.height - 1.6)).toBeLessThan(0.01);
  expect(
    Math.max(...frames.map((f) => f.height)) -
      Math.min(...frames.map((f) => f.height)),
  ).toBeLessThan(2);
  await page.goto("/#research");
  const research = await page
    .locator(".research-visual--motion")
    .evaluateAll((nodes) =>
      nodes.map(
        (n) =>
          n.getBoundingClientRect().width / n.getBoundingClientRect().height,
      ),
    );
  for (const ratio of research)
    expect(Math.abs(ratio - 1.6)).toBeLessThan(0.01);
});
