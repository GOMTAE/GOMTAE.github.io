import { test, expect } from "@playwright/test";

for (const [slug, title] of [
  ["ssp", "High Temporal Consistency"],
  ["flexpath", "FlexPath"],
  ["missionbench", "MissionBench"],
  ["voxelfix", "VoxelFix"],
]) {
  test(`preserved ${slug} paper remains available`, async ({ page }) => {
    await page.goto(`/publications/${slug}.html`);
    await expect(page.locator("h1").first()).toContainText(title);
    await expect(
      page.getByRole("heading", { name: "BibTeX", exact: true }),
    ).toBeAttached();
    for (const image of await page.locator("img[src]").all()) {
      const source = await image.getAttribute("src");
      if (source && !source.startsWith("http"))
        expect(
          (await page.request.get(new URL(source, page.url()).href)).status(),
        ).toBe(200);
    }
  });
}

test("VoxelFix scene controls, synchronized views and display modes work", async ({
  page,
}, testInfo) => {
  await page.goto("/publications/voxelfix.html#viewer");
  await expect(page.locator("#scene-select")).toBeEnabled({ timeout: 30000 });
  await expect(page.locator("#model-select")).toBeEnabled();
  await expect
    .poll(() => page.locator("#stat-matched").textContent())
    .not.toBe("0");
  await expect(page.locator(".canvas-grid canvas")).toHaveCount(3);
  await expect(page.locator("#scene-metrics")).toBeVisible();
  await page.getByRole("button", { name: "What changed", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "What changed", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Changed only" }).check();
  await page
    .getByRole("button", { name: "Correction outcome", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset synchronized camera" }).click();
  await page.getByRole("checkbox", { name: "Changed only" }).uncheck();
  await page.getByRole("button", { name: "Semantic", exact: true }).click();
  const canvas = page.locator("#input-canvas");
  await canvas.focus();
  const synchronizedViews = await page.locator(".canvas-grid canvas").all();
  const beforeCameraMove = [];
  for (const view of synchronizedViews)
    beforeCameraMove.push(await view.screenshot());
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  for (const [index, view] of synchronizedViews.entries()) {
    expect((await view.screenshot()).equals(beforeCameraMove[index])).toBe(
      false,
    );
  }
  await page.locator("#scene-select").selectOption("occufly-lenting");
  await expect(page.locator("#scene-load-status")).toContainText("Loaded", {
    ignoreCase: true,
  });
  await page.locator("#model-select").selectOption("upernet_swinv2_t");
  await expect(page.locator("#scene-load-status")).toContainText("Loaded", {
    ignoreCase: true,
  });
  await expect(page.locator("#stat-matched")).not.toHaveText("0");
  await page.screenshot({ path: testInfo.outputPath("voxel-viewer.png") });
});

test("VoxelFix reports unavailable WebGL and retains the paper", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...arguments_) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.call(this, type, ...arguments_);
    };
  });
  await page.goto("/publications/voxelfix.html#viewer");
  await expect(page.locator("#viewer-message")).toContainText("WebGL");
  await expect(
    page.getByRole("heading", { name: "Abstract", exact: true }),
  ).toBeAttached();
});
