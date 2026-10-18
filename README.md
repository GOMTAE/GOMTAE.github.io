# Taehyoung Kim - research portfolio

A static GitHub Pages portfolio for research, publications, independent projects, and technical writing. The portfolio uses Eleventy at build time; visitors receive HTML and a small progressive-enhancement script. Existing publication microsites and the VoxelFix WebGL viewer remain independent.

## Preview and validate

Requires Node.js 22 or newer. Browser tests use an installed Google Chrome.

```sh
npm ci
npm run build
npm run dev
# http://127.0.0.1:4173
```

```sh
npm run check           # Links, anchors, media, metadata, generated-file freshness
npm run lint            # Formatting of maintained sources
npm test                # Publishing/export safeguards and responsive browser tests
```

For bundled Chromium instead of Chrome, install it with `npx playwright install chromium`, then run `PLAYWRIGHT_CHANNEL=chromium npm test`.

`npm run dev` serves the current generated files. After changing content or templates, run `npm run build` and refresh. The preview excludes source files, local institutional reports, and development dependencies.

## Where to edit

| Content                                                       | Maintained source                                       |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| Page sections                                                 | `src/*.njk`                                             |
| Shared header, footer, article layout, research cards         | `src/_includes/`                                        |
| Publications, authors, bibliography, paper/project/code links | `src/_data/publications.js`                             |
| Personal projects and side ventures                           | `src/_data/projects.json`                               |
| Cleared institutional project contributions                   | `src/_data/work.json`                                   |
| Older thesis/experimental projects                            | `src/_data/archive.json`                                |
| Identity, contact, social links                               | `src/_data/site.json`                                   |
| Visual system and browser interactions                        | `assets/portfolio/site.css`, `assets/portfolio/site.js` |
| Blog posts, updates and technical notes                       | `src/posts/*.md`                                        |
| Independent paper microsites                                  | Existing `publications/*.html` and their assets         |

Do not manually edit generated root HTML, article HTML, feeds, sitemap, `.generated-pages.json`, or generated image dimensions. Templates and data are the source of truth. Existing paper microsites remain handwritten and retain their original styling.

## Publish a post

Start locally with `src/posts/my-note.draft.md` (ignored by Git). Example frontmatter:

```yaml
---
title: "Your article title"
slug: your-article-title
date: 2026-10-18
summary: "A concise, factual description of the article."
tags: [Perception, Engineering]
draft: true
# Optional:
# image: /images/approved-image.webp
# imageAlt: Description of the image and what it represents
# relatedProject: /publications/ssp.html
---
```

Write Markdown below it. Fenced code blocks with a language, tables, figures, and headings are supported. `date` controls chronological order and scheduled publication; future dates and `draft: true` are excluded from generated pages, the homepage, RSS, and sitemap. Use a lowercase hyphenated slug. Keep the slug stable once published.

When ready, rename to a normal `.md` filename, set `draft: false`, then run `npm run build`, `npm run check`, and `npm test`. Commit the source, generated article folder, changed indexes/feeds, and generated manifest together. The homepage automatically shows the three newest published posts. Unpublishing and rebuilding removes only previously generated article HTML.

This is a public repository and root-based Pages deployment: a committed Markdown source can be read directly, even if its generated article is a draft. Keep confidential writing outside the repository. Ignored `*.draft.md` files remain local. A future-dated article appears only after a new build on or after its date; there is no scheduler.

## Add independent work

Append an entry to `src/_data/projects.json` with `title`, `kind` (for example `Independent project`), `description`, and a verified `url`. An optional `image` requires descriptive `imageAlt`. Use approved media with appropriate dimensions and provenance. The independent-work section appears only when it contains entries; no empty placeholders are published.

## Institutional work

`src/_data/work.json` deliberately starts with no project cards. Each entry follows the schema documented in `docs/content-questions.md`. Only `review_state: approved_for_personal_website` is rendered. The public existence of an institutional project does not establish personal involvement or reuse permission. Never commit confidential reports or internal imagery.

## Assets

`npm run assets` regenerates faithful AVIF/WebP derivatives, a social image, and dimensions from the original research media. It needs FFmpeg and the pinned Sharp dependency. It does not alter original scientific figures. Rebuild pages afterward. Existing sources and new MultiFly media are recorded in `docs/asset-manifest.md`.

## GitHub Pages compatibility

The build stages in ignored `.site-build/`, then exports an allowlisted set of HTML/XML routes into the existing root publishing tree. `npm run build` refuses to overwrite unrecognized handwritten files and never exports into the publication microsites. There is no new deployment workflow or hosting service. `.nojekyll`, verification HTML, historical URLs, and license files are preserved.

Nothing has been merged or deployed as part of this redesign. Review the feature branch before deciding to publish. Keep the original `README.txt`, `LICENSE.txt`, and visible HTML5 UP attribution with retained theme assets. The scholarly microsites retain their Academic Project Page Template attribution.
