# Write and publish from your browser

No local checkout, build command, or terminal is required. Articles are Markdown files; GitHub builds and deploys the website after changes reach `main`.

## Publish an article

1. Copy the text in [the article template](article-template.md).
2. Open [New article on GitHub](https://github.com/GOMTAE/GOMTAE.github.io/new/main/src/posts).
3. Name the file `your-article-title.md`, paste the template, and write your article.
4. Set `title`, `slug`, `date`, `summary`, and `tags`. Use today's date or an earlier date to publish immediately. The date uses UTC. Use lowercase words separated by hyphens for the slug; keep it stable after publishing.
5. Set `draft: false` when ready, then click **Commit changes**. Commit to `main`, or create a branch and pull request if you want to review changes first.
6. Follow [Publish website in Actions](https://github.com/GOMTAE/GOMTAE.github.io/actions/workflows/publish.yml). When deployment finishes, your article appears at `https://gomtae.github.io/writing/your-article-title/`.

The writing index, three newest posts on the homepage, RSS, and sitemap update automatically. Failed checks prevent deployment and leave the previous live version in place. Allow a few minutes for installation, checks, deployment, and caching.

## Edit or remove an article

Open [the posts folder](https://github.com/GOMTAE/GOMTAE.github.io/tree/main/src/posts), select an article, and click the pencil to edit it. Commit the update. To unpublish, set `draft: true` or delete the Markdown file. The next successful deployment removes its generated page and index entries.

## Images and code

Upload approved images into `images/writing/` using GitHub's **Add file > Upload files**, then reference them from your article:

```html
<figure>
  <img
    src="/images/writing/example.webp"
    alt="Describe what the image shows"
    width="1200"
    height="800"
    loading="lazy"
  />
  <figcaption>A short caption with credit where needed.</figcaption>
</figure>
```

Use the image's actual width and height. The site checks require descriptive alt text and dimensions. Fenced code blocks, headings, lists, and tables work in Markdown. For an optional article cover, add `image: /images/writing/example.webp` and `imageAlt: A descriptive caption` to the frontmatter.

## Drafts, scheduling, and preview

- `draft: true` excludes an article from the website. This repository is public, so committed drafts remain readable on GitHub. Keep private drafts in your preferred private writing app until ready.
- A future `date` holds the article until that day. A daily build runs around 01:17 UTC; GitHub may delay scheduled runs. Use **Run workflow** in Actions if you want to publish immediately after the date arrives. GitHub can disable schedules after 60 days without repository activity; a push or manual run still publishes eligible posts.
- The GitHub editor's **Preview** tab previews Markdown, not the exact website styling. Pull requests run checks but do not create a hosted website preview.
- For an exact local preview, run `npm ci`, `npm run build`, then `npm run dev` and open `http://127.0.0.1:4173`.

## How deployment works

The workflow builds Eleventy pages, checks links and formatting, tests publishing, and runs responsive browser and accessibility checks. It packages only generated pages and tracked public assets into `.pages-build/`, preserving independent publication microsites. It does not upload article sources, development files, or dependencies to Pages.

GitHub Pages must use **GitHub Actions** as its publishing source in repository **Settings > Pages**. Generated HTML does not need to be committed for browser publishing; the workflow rebuilds from maintained sources every time.
