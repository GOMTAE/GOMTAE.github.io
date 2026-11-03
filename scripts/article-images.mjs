import { parse, serialize } from "parse5";
import { resolve, sep } from "node:path";
import sharp from "sharp";

// Images inserted by the visual editor need no hand-written HTML dimensions.
export async function sizeArticleImages(content, root = process.cwd()) {
  const document = parse(content);
  let changed = false;
  async function visit(node) {
    if (node.tagName === "img") {
      const attributes = Object.fromEntries(
        node.attrs.map(({ name, value }) => [name, value]),
      );
      if (!attributes.width || !attributes.height) {
        const source = attributes.src || "";
        if (!/^\/(images|assets)\//.test(source))
          throw new Error(
            `Upload article images to the image library: ${source}`,
          );
        const path = resolve(
          root,
          `.${decodeURIComponent(source.split(/[?#]/)[0])}`,
        );
        if (!path.startsWith(`${resolve(root)}${sep}`))
          throw new Error(`Article image escapes the site: ${source}`);
        const metadata = await sharp(path).metadata();
        let { width, height } = metadata;
        if (metadata.orientation >= 5) [width, height] = [height, width];
        if (!width || !height)
          throw new Error(`Cannot read article image dimensions: ${source}`);
        node.attrs = node.attrs.filter(
          ({ name }) => !["width", "height"].includes(name),
        );
        node.attrs.push(
          { name: "width", value: String(width) },
          { name: "height", value: String(height) },
        );
        if (!attributes.loading)
          node.attrs.push({ name: "loading", value: "lazy" });
        changed = true;
      }
    }
    await Promise.all((node.childNodes || []).map(visit));
  }
  await visit(document);
  return changed ? serialize(document) : content;
}
