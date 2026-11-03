import { execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Publish built routes and tracked public assets, never the repository root.
export async function packageSite(root = process.cwd()) {
  const destination = join(root, ".pages-build");
  const generated = JSON.parse(
    await readFile(join(root, ".generated-pages.json"), "utf8"),
  );
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  }).split("\0");
  const publicFiles = tracked.filter((path) =>
    /^(assets\/|images\/|publications\/|\.nojekyll$|CNAME$|robots\.txt$|google[a-z0-9]+\.html$|LICENSE\.txt$|README\.txt$)/.test(
      path,
    ),
  );
  for (const route of generated) {
    if (
      !/^(index\.html|404\.html|projects\.html|publications\.html|writing\.html|work\.html|bio\/index\.html|writing\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html|feed\.xml|sitemap\.xml)$/.test(
        route,
      )
    )
      throw new Error(`Unexpected generated route: ${route}`);
  }
  const files = [...new Set([...generated, ...publicFiles])].sort();
  // Check every component, so a symlinked parent cannot expose local files.
  for (const path of files) {
    let source = root;
    for (const part of path.split("/")) {
      if (!part || part === "." || part === "..")
        throw new Error(`Unexpected public path: ${path}`);
      source = join(source, part);
      if ((await lstat(source)).isSymbolicLink())
        throw new Error(`Refusing public symlink: ${path}`);
    }
    if (!(await lstat(source)).isFile())
      throw new Error(`Public path is not a file: ${path}`);
  }
  await rm(destination, { recursive: true, force: true });
  for (const path of files) {
    const target = join(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(root, path), target);
  }
  console.log(`Packaged ${files.length} public files in .pages-build/`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await packageSite();
