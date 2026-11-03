# Write and publish from your browser

Use the visual dashboard for everyday writing, or the GitHub editor as a fallback. No local checkout, build command, or terminal is required. GitHub builds and deploys the website after saves reach `main`.

## Use the visual writing dashboard

Open [your writing dashboard](https://gomtae.github.io/admin/). It opens Pages CMS, the visual editor connected to this repository.

### One-time sign-in

Sign in with GitHub and authorize the Pages CMS GitHub App for **only `GOMTAE.github.io`**. This lets the editor save articles and images in that repository. Review its terms and permissions yourself. The website does not store your GitHub password or an access token.

### Write and publish

1. Open **Writing** and choose **New entry**.
2. Add your title and short introduction. The publication date defaults to today, and the page address is created from the title automatically.
3. Write in the visual **Article** editor. Use the formatting toolbar for headings, links, lists, code, and images. **Source** is available if you prefer Markdown.
4. Use **Cover / teaser image** to choose the image shown on the writing-page card, homepage card, and inside the article. Upload inline images anywhere in the article using the image picker. Add a description for each image. Image dimensions are handled automatically.
5. Leave **Keep as draft** on and save while writing. When ready, turn it off and save again. GitHub builds and publishes the article automatically.

Saved drafts are not shown on the website, but their Markdown files are readable in the public GitHub repository. Keep sensitive drafts in a private writing app until ready.

Use the same dashboard to reopen and edit existing articles. Keep the page address stable after publishing. A future publication date schedules the article for a later build. The rich-text editor previews formatting; it does not preview the exact public website layout.

If a cover image is selected, its description is required. Inline images also need descriptive alt text. A failed build leaves the previous live version in place; see [publishing status](https://github.com/GOMTAE/GOMTAE.github.io/actions/workflows/publish.yml) for details.

## Publish without the dashboard

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

Uploaded images receive dimensions automatically during the build. Add descriptive alt text. Fenced code blocks, headings, lists, and tables work in Markdown. For an optional article cover, add `image: /images/writing/example.webp` and `imageAlt: A descriptive caption` to the frontmatter.

## Drafts, scheduling, and preview

- `draft: true` excludes an article from the website. This repository is public, so committed drafts remain readable on GitHub. Keep private drafts in your preferred private writing app until ready.
- A future `date` holds the article until that day. A daily build runs around 01:17 UTC; GitHub may delay scheduled runs. Use **Run workflow** in Actions if you want to publish immediately after the date arrives. GitHub can disable schedules after 60 days without repository activity; a push or manual run still publishes eligible posts.
- The GitHub editor's **Preview** tab previews Markdown, not the exact website styling. Pull requests run checks but do not create a hosted website preview.
- For an exact local preview, run `npm ci`, `npm run build`, then `npm run dev` and open `http://127.0.0.1:4173`.

## How deployment works

The workflow builds Eleventy pages, checks links and formatting, tests publishing, and runs responsive browser and accessibility checks. It packages only generated pages and tracked public assets into `.pages-build/`, preserving independent publication microsites. It does not upload article sources, development files, or dependencies to Pages.

GitHub Pages must use **GitHub Actions** as its publishing source in repository **Settings > Pages**. Generated HTML does not need to be committed for browser publishing; the workflow rebuilds from maintained sources every time.
