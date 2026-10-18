import { readFileSync } from "node:fs";
export default JSON.parse(
  readFileSync("assets/portfolio/media/loops.json", "utf8"),
);
