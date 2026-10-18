import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".gz": "application/octet-stream",
  ".txt": "text/plain",
};
const allowed = (path) =>
  /^\/(assets|images|publications)\//.test(path) ||
  /^\/writing\/[a-z0-9-]+\/(index\.html)?$/.test(path) ||
  /^\/(index\.html|projects\.html|publications\.html|writing\.html|work\.html|404\.html|feed\.xml|sitemap\.xml|robots\.txt|google6a2a60579da58104\.html|LICENSE\.txt)?$/.test(
    path,
  );
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (!allowed(path) || path.includes("..") || path.includes("\\"))
      throw Object.assign(new Error("Not found"), { code: "ENOENT" });
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(root, `.${path}`);
    const info = await stat(file);
    if (!info.isFile())
      throw Object.assign(new Error("Not found"), { code: "ENOENT" });
    const bytes = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": bytes.length,
      "Cache-Control": "no-cache",
    });
    response.end(bytes);
  } catch (error) {
    if (error.code !== "ENOENT") console.error(error.message);
    const page = await readFile(resolve(root, "404.html")).catch(() =>
      Buffer.from("Not found"),
    );
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(page);
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Portfolio preview: http://127.0.0.1:${port}`),
);
