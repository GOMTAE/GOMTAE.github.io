export default {
  layout: "article.njk",
  eleventyComputed: {
    permalink: (data) =>
      data.draft || data.page.date > new Date()
        ? false
        : `/writing/${data.slug || data.page.fileSlug}/index.html`,
    description: (data) => data.summary,
  },
};
