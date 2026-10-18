import publications from "./publications.js";
import { readFileSync } from "node:fs";

const updates = JSON.parse(readFileSync("src/_data/updates.json", "utf8"));
const now = new Date();
export default [
  ...publications.map((paper) => ({
    date: paper.date,
    title:
      paper.type === "preprint"
        ? `${paper.shortTitle} preprint`
        : `${paper.shortTitle} at ${paper.status}`,
    text: paper.description,
    url: paper.project || paper.paper,
    kind: "Publication",
  })),
  ...updates,
]
  .filter((update) => !update.draft && new Date(update.date) <= now)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 4);
