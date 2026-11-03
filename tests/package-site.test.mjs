import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  access,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageSite } from "../scripts/package-site.mjs";

test("deployment uses fresh generated routes and tracked public files only", async () => {
  const root = await mkdtemp(join(tmpdir(), "portfolio-artifact-"));
  const put = async (path, content) => {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  };
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    for (const [path, content] of Object.entries({
      "index.html": "fresh generated homepage",
      "writing/new-note/index.html": "fresh article",
      "writing/removed/index.html": "stale committed article",
      "publications/ssp.html": "handwritten microsite",
      "images/public.svg": "public image",
      "assets/site.css": "public styles",
      ".nojekyll": "",
      "robots.txt": "public robots",
      "google123.html": "verification",
      "src/posts/private.md": "draft source",
      "README.md": "developer notes",
      "node_modules/local.txt": "dependency",
    }))
      await put(path, content);
    execFileSync("git", ["add", "."], { cwd: root });
    await put("images/local-only.svg", "untracked image");
    await put(
      ".generated-pages.json",
      JSON.stringify(["index.html", "writing/new-note/index.html"]),
    );
    await put(".pages-build/obsolete.html", "stale previous artifact");
    await packageSite(root);
    for (const path of [
      "index.html",
      "writing/new-note/index.html",
      "publications/ssp.html",
      "images/public.svg",
      "assets/site.css",
      ".nojekyll",
      "robots.txt",
      "google123.html",
    ]) {
      assert.equal(
        await readFile(join(root, ".pages-build", path), "utf8"),
        await readFile(join(root, path), "utf8"),
      );
    }
    for (const path of [
      "src",
      ".git",
      "README.md",
      "node_modules",
      "images/local-only.svg",
      "writing/removed",
      "obsolete.html",
    ]) {
      await assert.rejects(access(join(root, ".pages-build", path)));
    }
    await put(".generated-pages.json", JSON.stringify(["../private.html"]));
    await assert.rejects(packageSite(root), /Unexpected generated route/);
    await put(".generated-pages.json", JSON.stringify(["index.html"]));
    await symlink(join(root, "src/posts"), join(root, "images/linked"));
    execFileSync("git", ["add", "images/linked"], { cwd: root });
    await assert.rejects(packageSite(root), /Refusing public symlink/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
