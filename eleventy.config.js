import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { readFileSync } from "node:fs";

export default function (config) {
  config.addPlugin(syntaxHighlight);
  config.addFilter("activityMonth", (value) =>
    new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value)),
  );
  config.addTransform("cleanBlankLines", (content) =>
    content.replace(/^[\t ]+$/gm, ""),
  );
  const sizes = JSON.parse(
    readFileSync("assets/portfolio/media/dimensions.json", "utf8"),
  );
  config.addFilter("mediaSize", (name) => sizes[name]);
  config.addFilter("publicationType", (publications, type) =>
    publications.filter((paper) => paper.type === type),
  );
  config.addCollection("posts", (api) => {
    const posts = api
      .getFilteredByGlob("src/posts/*.md")
      .filter((post) => !post.data.draft && post.date <= new Date());
    const slugs = new Set();
    for (const post of posts) {
      const slug = post.data.slug || post.fileSlug;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw new Error(`Invalid article slug: ${slug}`);
      if (slugs.has(slug)) throw new Error(`Duplicate article slug: ${slug}`);
      slugs.add(slug);
      if (!post.data.title || !post.data.summary || !post.data.date)
        throw new Error(
          `Article needs title, summary and date: ${post.inputPath}`,
        );
      if (post.data.tags && !Array.isArray(post.data.tags))
        throw new Error(`Article tags must be a list: ${post.inputPath}`);
      if (post.data.image && !post.data.imageAlt)
        throw new Error(`Article image needs imageAlt: ${post.inputPath}`);
    }
    return posts.sort((a, b) => b.date - a.date);
  });
  config.addFilter("dateLabel", (value) =>
    new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(value)),
  );
  config.addFilter("isoDate", (value) => new Date(value).toISOString());
  config.addFilter(
    "absolute",
    (value) => new URL(value, "https://gomtae.github.io").href,
  );
  config.addFilter("jsonScript", (value) =>
    JSON.stringify(value).replaceAll("<", "\\u003c"),
  );
  config.addFilter("take", (items, count) => items.slice(0, count));
  config.addFilter("xml", (value) =>
    String(value).replace(
      /[<>&"']/g,
      (character) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[character],
    ),
  );
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  return {
    dir: {
      input: "src",
      output: ".site-build",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: false,
  };
}
