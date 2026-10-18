import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parse } from "parse5";

const manifest = JSON.parse(await readFile(".generated-pages.json", "utf8"));
const errors = [];
const documents = new Map();
const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
async function documentFor(path) {
  if (!documents.has(path))
    documents.set(path, walk(parse(await readFile(path, "utf8"))));
  return documents.get(path);
}
for (const path of manifest.filter((path) => path.endsWith(".html"))) {
  const nodes = await documentFor(path);
  const ids = new Set();
  for (const node of nodes) {
    const attributes = Object.fromEntries(
      (node.attrs || []).map((item) => [item.name, item.value]),
    );
    if (attributes.id) {
      if (ids.has(attributes.id))
        errors.push(`${path}: duplicate ID ${attributes.id}`);
      ids.add(attributes.id);
    }
    if (
      node.tagName === "img" &&
      (!attributes.alt || !attributes.width || !attributes.height)
    )
      errors.push(`${path}: image missing descriptive alt/dimensions`);
    if (
      node.tagName === "script" &&
      attributes.type === "application/ld+json"
    ) {
      try {
        JSON.parse(node.childNodes.map((child) => child.value || "").join(""));
      } catch {
        errors.push(`${path}: invalid JSON-LD`);
      }
    }
    const destinations = [
      attributes.href,
      attributes.poster,
      attributes["data-loop-src"],
      attributes.src,
      ...(attributes.srcset
        ?.split(",")
        .map((item) => item.trim().split(/\s+/)[0]) || []),
    ].filter(Boolean);
    for (const destination of destinations) {
      if (/^(https?:|mailto:|data:|tel:)/.test(destination)) continue;
      const [encoded, hash] = destination.split("#");
      const raw = decodeURIComponent(encoded);
      let target = raw
        ? resolve(
            raw.startsWith("/") ? "." : dirname(path),
            `.${raw.startsWith("/") ? raw : `/${raw}`}`,
          )
        : resolve(path);
      if (raw.endsWith("/") || raw === "/")
        target = resolve(target, "index.html");
      try {
        await access(target);
        if (hash && target.endsWith(".html")) {
          const linked = await documentFor(target);
          if (
            !linked.some((item) =>
              item.attrs?.some(
                (attribute) =>
                  attribute.name === "id" && attribute.value === hash,
              ),
            )
          )
            errors.push(`${path}: missing anchor ${destination}`);
        }
      } catch {
        errors.push(`${path}: missing local resource ${destination}`);
      }
    }
  }
  if (nodes.filter((node) => node.tagName === "h1").length !== 1)
    errors.push(`${path}: expected one h1`);
  if (
    !nodes.some(
      (node) =>
        node.tagName === "link" &&
        node.attrs?.some(
          (item) => item.name === "rel" && item.value === "canonical",
        ),
    )
  )
    errors.push(`${path}: missing canonical`);
}
for (const route of manifest) {
  const expected = await readFile(`.site-build/${route}`, "utf8");
  if (expected !== (await readFile(route, "utf8")))
    errors.push(`${route}: generated output is stale`);
}
const preservedRoutes = [
  "publications/ssp.html",
  "publications/voxelfix.html",
  "publications/flexpath.html",
  "publications/missionbench.html",
  "google6a2a60579da58104.html",
  ".nojekyll",
  "LICENSE.txt",
];
for (const path of preservedRoutes) {
  try {
    await access(path);
  } catch {
    errors.push(`Missing preserved route or deployment file: ${path}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${manifest.length} generated routes: local links, anchors, media, metadata, output freshness and preserved routes pass.`,
  );
