import { rm } from "node:fs/promises";
// This fixed, ignored directory contains only disposable Eleventy staging output.
await rm(new URL("../.site-build/", import.meta.url), {
  recursive: true,
  force: true,
});
