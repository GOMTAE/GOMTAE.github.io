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
| Fraunhofer project overviews and contributions                   | `src/_data/work.json`                                   |
| Older thesis/experimental projects                            | `src/_data/archive.json`                                |
| Identity, contact, social links                               | `src/_data/site.json`                                   |
| Visual system and browser interactions                        | `assets/portfolio/site.css`, `assets/portfolio/site.js` |
| Blog posts, updates and technical notes                       | `src/posts/*.md`                                        |
| Independent paper microsites                                  | Existing `publications/*.html` and their assets         |

Do not manually edit generated root HTML, article HTML, feeds, sitemap, `.generated-pages.json`, or generated media dimension/timing manifests. Templates and data are the source of truth. Existing paper microsites remain handwritten and retain their original styling.

## Publish a post

Open [the visual writing dashboard](https://gomtae.github.io/admin/), sign in with GitHub, and select **Writing**. Add a title, introduction, and article using the rich-text editor; upload images from its image library. New articles start as drafts. Turn off **Keep as draft** and save to publish automatically. The first visit requires authorizing Pages CMS for this repository.

As a fallback, write directly in GitHub: copy [the article template](docs/article-template.md) into a [new Markdown file under src/posts](https://github.com/GOMTAE/GOMTAE.github.io/new/main/src/posts), set the title, slug, date, summary and tags, and set `draft: false`. Commit to `main` or merge a pull request. GitHub Actions builds, validates, and deploys automatically. No local build or generated-file commit is required.

See [the writing guide](docs/writing.md) for editing, images, scheduling, and previews. The homepage, writing index, RSS, and sitemap update automatically. Drafts and future posts stay off the website, but committed sources remain readable in this public repository. Keep private drafts outside the repository or in ignored `src/posts/*.draft.md` files.

## Add independent work

Append an entry to `src/_data/projects.json` with `title`, `kind` (for example `Independent project`), `description`, and a verified `url`. An optional `image` requires descriptive `imageAlt`. Use approved media with appropriate dimensions and provenance. The independent-work section appears only when it contains entries; no empty placeholders are published.

## Institutional work

`src/_data/work.json` supplies the four-project showcase at `/work.html`, linked from Selected research and the Research page. Each entry includes a sourced public summary, the published project period and status, focus areas, sources, and user-confirmed contributions. An empty `contributions` array displays a short placeholder. Add only confirmed personal responsibilities; a project’s public description does not establish an individual contribution. Keep confidential reports and internal imagery outside the repository. See `docs/content-questions.md` for the schema and details still needed.

## Assets

`npm run assets` regenerates faithful AVIF/WebP derivatives, a social image, and dimensions from the original research media. It needs FFmpeg and the pinned Sharp dependency. It does not alter original scientific figures. Rebuild pages afterward. Existing sources and new MultiFly media are recorded in `docs/asset-manifest.md`.

## GitHub Pages compatibility

The build stages in ignored `.site-build/`, then exports an allowlisted set of HTML/XML routes into the existing root publishing tree. `npm run build` refuses to overwrite unrecognized handwritten files and never exports into the publication microsites. The Publish website workflow packages generated routes and tracked public assets into ignored `.pages-build/` and deploys using GitHub Actions. Pages must use GitHub Actions as its publishing source. `.nojekyll`, verification HTML, historical URLs, and license files are preserved.

Keep the original `README.txt`, `LICENSE.txt`, and visible HTML5 UP attribution with retained theme assets. The scholarly microsites retain their Academic Project Page Template attribution.

## Publication preview images, GIFs, and video

Publication previews now have a generous media column on desktop and remain visible on tablet and mobile. The complete figure is contained within the preview, so its legend and panels are not cropped. Default responsive stills continue to use the publication's `image` key.

To replace one publication's still with a GIF, add this optional object to its record in `src/_data/publications.js` after adding your approved asset:

```js
preview: {
  type: "image",
  src: "/images/approved-preview.gif",
  alt: "Describe the real method and comparison shown in the animation.",
  width: 1280,
  height: 736,
},
```

The image is lazy-loaded. Visitors requesting reduced motion see the existing static publication image instead. Match `width` and `height` to the actual asset.

A short MP4/WebM is generally more efficient than a large GIF. The same slot supports a video with native controls, a still poster, and no automatic playback or initial video download. For example, the existing SSP comparison can be configured as:

```js
preview: {
  type: "video",
  src: "/publications/static/videos/ssp_banner_video.mp4",
  mime: "video/mp4", // use video/webm for a WebM source
  poster: "/assets/portfolio/media/ssp-1280.webp",
  alt: "SSP video comparing Image Model, KD-SSP, NetWarp, and TCB-OCR.",
  width: 1280,
  height: 736,
},
```

The record is validated during the build. Add the media's provenance to the asset ledger, then build and review locally before publishing. All five publications now use the shared inline loop player.

## Orbit identity

The header uses the user-supplied minimal Orbit SVG beside the name as one accessible home link. It has a single 950 ms hover/keyboard-focus animation and a static reduced-motion presentation. The matching SVG favicon adapts its ring for dark browser chrome. Original minimal and inverse vector assets are retained in `assets/portfolio/brand/`; the generated concept-board imagery from the ZIP is not used on the site.

## Inline project animations

The four archived project demos play silent loops when visible. Pause/play controls are available on each. Scrolling away or hiding the tab pauses playback, and a visitor’s explicit pause is preserved. Reduced-motion and data-saving visitors receive stills until they choose to play. Without JavaScript, the static figures remain available.

Run `npm run assets:motion` to regenerate the MP4 derivatives and timing/dimension manifest from the original GIFs/video. FFmpeg is required. The conversions retain the original frame timing and avoid loading the large GIF files into each card. A still remains visible if playback fails.

Publication loops appear on the homepage, projects and publication index, in consistent 16:10 frames, without visible playback controls or a reserved control strip. Source content is contained without stretching or cropping; matching background colors blend the space around unusually wide or square sources. They load/play only when visible and retain stills for reduced-motion and data-saving preferences. The earlier-project archive retains its explicit controls. The homepage opens with a priority-loaded personal portrait and introduction; research previews appear further down.

Run `npm run assets:publications` to regenerate the publication media. Set `MULTIFLY_PREVIEW_SOURCE` and `VOXELFIX_PREVIEW_SOURCE` to override the original local video paths. This requires FFmpeg, sharp and network access for the four FlexPath sources. Optional `PUBLICATION_PREVIEW_ONLY=flexpath` regenerates just that output. The script writes only the final MP4 loops, matching WebP fallback posters and a source/trim/crop manifest at `publication-loops.json`. Conversion inputs and intermediates live in a temporary directory that is removed on success or failure. Duplicate GIF exports are not retained.

MultiFly uses seconds 8-23 with title/legend bands and excess side space cropped to fill the frame; RGB/LiDAR labels are re-anchored inside the crop. VoxelFix uses seconds 16-20.5, cropped to the Scene 2 before/after wipe and its labels. MissionBench retains the first 15 seconds of the rooftop-inspection mission. SSP uses seconds 5-20 of the existing comparison, cropped to the KD-SSP output panel. FlexPath combines all four original GIFs into a seamless 2-by-2 collage with labels in the outer left/right margins, looping each source at its original timing within a 15-second excerpt. No scientific motion is synthesized. See the asset ledger for provenance and attribution.

## Professional bio

`/bio/` provides a short third-person biography with a copy button and a first-person career and education timeline. Edit `src/_data/bio.json` to update the biography or dated milestones. The homepage and footer link to this page; it uses the existing optimized portrait and is included in the sitemap.

Organization marks on the biography timeline are stored in `assets/portfolio/brand/organizations/`. Sources: [TUM](https://commons.wikimedia.org/wiki/File:Logo_of_the_Technical_University_of_Munich.svg), [Fraunhofer](https://commons.wikimedia.org/wiki/File:Fraunhofer-logo.svg), [Pusan National University](https://commons.wikimedia.org/wiki/File:Pusan_national_university_logotype.svg), and [Azena via PR Newswire](https://www.prnewswire.com/de/pressemitteilungen/security-amp-safety-things-wird-zu-azena-unterstreicht-fortschritte-in-entwicklung-von-plattform-fur-smarte-kameras-809268416.html). The TUM, Fraunhofer, and PNU wordmarks are marked public domain on Wikimedia Commons; all names and marks remain trademarks of their respective organizations.
