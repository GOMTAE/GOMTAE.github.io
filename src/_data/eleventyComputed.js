export default {
  personSchema: (data) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.site.name,
    url: data.site.url,
    jobTitle: "Research Engineer",
    worksFor: { "@type": "Organization", name: "Fraunhofer IVI" },
    sameAs: [data.site.github, data.site.linkedin, data.site.scholar],
  }),
  publicationSchema: (data) => ({
    "@context": "https://schema.org",
    "@graph": data.publications.map((paper) => ({
      "@type": "ScholarlyArticle",
      name: paper.title,
      url: paper.paper,
      author: paper.authors.map((author) => ({
        "@type": "Person",
        name: author.name,
      })),
      description: paper.description,
      identifier: `arXiv:${paper.arxiv}`,
      datePublished: String(paper.year),
    })),
  }),
  articleSchema: (data) => ({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: data.summary,
    author: { "@type": "Person", name: data.site.name, url: data.site.url },
    datePublished: data.page.date.toISOString(),
    url: new URL(data.page.url || "/", data.site.url).href,
  }),
};
