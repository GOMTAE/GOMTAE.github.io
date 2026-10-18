import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  cp,
  writeFile,
  readFile,
  mkdir,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parse } from "parse5";

test("publication previews accept GIFs with a reduced-motion still, and user-controlled video without nested links", async () => {
  const root = resolve(".");
  const fixture = await mkdtemp(join(tmpdir(), "portfolio-preview-"));
  const nodes = (node) => [node, ...(node.childNodes || []).flatMap(nodes)];
  const attributes = (node) =>
    Object.fromEntries((node.attrs || []).map((a) => [a.name, a.value]));
  try {
    await cp("src", join(fixture, "src"), { recursive: true });
    await cp("eleventy.config.js", join(fixture, "eleventy.config.js"));
    await writeFile(join(fixture, "package.json"), '{"type":"module"}');
    await mkdir(join(fixture, "assets/portfolio/media"), { recursive: true });
    await cp(
      "assets/portfolio/media/dimensions.json",
      join(fixture, "assets/portfolio/media/dimensions.json"),
    );
    await cp(
      join(root, "assets/portfolio/media/loops.json"),
      join(fixture, "assets/portfolio/media/loops.json"),
    );
    await cp(
      join(root, "assets/portfolio/media/publication-loops.json"),
      join(fixture, "assets/portfolio/media/publication-loops.json"),
    );
    await symlink(join(root, "node_modules"), join(fixture, "node_modules"));
    const original = await readFile("src/_data/publications.js", "utf8");
    async function render(preview) {
      await rm(join(fixture, ".site-build"), { recursive: true, force: true });
      await writeFile(
        join(fixture, "src/_data/publications.js"),
        original.replace(
          "export default records.map",
          `records.find(record => record.id === 'ssp').preview = ${JSON.stringify(preview)};\nexport default records.map`,
        ),
      );
      execFileSync(
        process.execPath,
        [join(root, "node_modules/@11ty/eleventy/cmd.cjs")],
        { cwd: fixture, stdio: "pipe" },
      );
      return parse(
        await readFile(join(fixture, ".site-build/publications.html"), "utf8"),
      );
    }
    const imagePreview = {
      type: "image",
      src: "/images/SSP.gif",
      alt: "SSP temporal comparison animation",
      width: 1280,
      height: 736,
    };
    const imageTree = await render(imagePreview);
    const gif = nodes(imageTree).find(
      (n) => n.tagName === "img" && attributes(n).src === imagePreview.src,
    );
    assert.ok(gif);
    assert.equal(attributes(gif).loading, "lazy");
    assert.ok(
      gif.parentNode.childNodes.some(
        (n) =>
          attributes(n).media === "(prefers-reduced-motion: reduce)" &&
          attributes(n).srcset.includes("ssp-1280.webp"),
      ),
    );
    const videoPreview = {
      type: "video",
      src: "/publications/static/videos/ssp_banner_video.mp4",
      poster: "/assets/portfolio/media/ssp-1280.webp",
      alt: "SSP four-method comparison video",
      width: 1280,
      height: 736,
    };
    const videoTree = await render(videoPreview);
    const video = nodes(videoTree).find(
      (n) =>
        n.tagName === "video" && attributes(n).poster === videoPreview.poster,
    );
    assert.ok(video);
    assert.equal(attributes(video).preload, "none");
    assert.equal(attributes(video).poster, videoPreview.poster);
    assert.ok(Object.hasOwn(attributes(video), "controls"));
    assert.ok(!Object.hasOwn(attributes(video), "autoplay"));
    for (
      let ancestor = video.parentNode;
      ancestor;
      ancestor = ancestor.parentNode
    )
      assert.notEqual(ancestor.tagName, "a");
    await assert.rejects(
      render({ ...videoPreview, width: 0 }),
      /Command failed/,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
