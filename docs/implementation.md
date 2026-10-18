# Portfolio redesign

## Baseline audit

- Branch: feat/research-portfolio-hybrid-2026, from f366916 (main/origin/main).
- Root pages: handwritten HTML5 UP Massively home, Projects and Publications, duplicated navigation/footer, no build or tests.
- Publication microsites: SSP, VoxelFix, FlexPath, MissionBench. Bulma and page-specific assets are independent of root theme.
- VoxelFix: native WebGL, three synchronized views, 11 compressed real scene bundles, multiple segmentation models, coordinate matching. Preserve all source and data.
- Media: 85 MB images, including 17 MB SSP GIF; SSP MP4 6.3 MB; VoxelFix data 20 MB. pic01.jpg is generic blurred template imagery, not a portrait.
- Existing older thesis and experimental projects remain archived.
- Untracked images/VoxelFix/teaser.svg must remain untouched and untracked (user confirmed).
- reference/ is ignored and contains institutional reports. Never copy it into public output.
- Verification HTML, .nojekyll, licenses and template attribution must remain.

## Architecture

Retain static GitHub Pages hosting and the independent publication microsites. Eleventy provides build-time shared layouts, one publication registry and Markdown articles. It produces only generated portfolio pages in ignored .site-build/. A small exporter copies generated routes to the existing root publishing tree; it refuses to overwrite unrecognized pages. No Pages settings, workflow, backend, SPA or hosting migration. Runtime JavaScript only enhances navigation, media, copying citations and filters.

## Checklist

- [x] Confirm baseline, preserve local work, create feature branch
- [x] Audit routes, media, architecture
- [x] Implement editorial design and sourced registry
- [x] Implement writing, RSS, metadata and safe export
- [x] Optimize authentic media and record provenance
- [x] Regression and accessibility tests, responsive screenshots
- [x] Document results and remaining content requests

No production deployment, push or merge is authorized.
