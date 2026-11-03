# Content handoff

These inputs enable future improvements. None blocks the implemented public-content redesign.

## Confirmed in this session

- Leave `images/VoxelFix/teaser.svg` untouched and untracked.
- Include integrated Markdown writing with an initially empty Writing page and no invented articles.
- Use the current official 14-author MultiFly roster. Both arXiv landing page and v2 PDF checked on 2026-10-18 omit Sai B. Matha. The discrepancy noted in the brief is no longer present in the consulted sources. Markus Gross, Andreas Greiner and Taehyoung Kim retain equal-contribution markers; Paul Spannaus retains the correspondence marker.
- The user supplied the MultiFly project website on 22 October 2026: https://markus-42.github.io/multifly/. It is linked alongside the paper; no local MultiFly microsite is created.

## Specific optional inputs

1. **Applied work:** For VERUM, NiKoLaS, ADAM, and ENGEL, provide your specific responsibility, 1-3 contribution bullets, collaborators, and any shareable outcomes. Confirm completion or ongoing status and any extensions.
2. **Portrait and CV:** A genuine portrait was supplied and is used on the homepage and bio page. A current public CV can be added when available.
3. **RGB/segmentation comparison:** A matched RGB frame and corresponding prediction, with model, capture/frame identifier, class palette, source, and permission. Current figures contain inset comparisons, so a pixel-aligned before/after slider is deliberately not shipped.
4. **MultiFly links:** The project URL is linked. Add code/data URLs when confirmed.
5. **Writing:** The first authentic post or update can be added using the README instructions. Independent ventures can be added to the separate projects registry once you have approved descriptions and links.

## Fraunhofer project showcase

The user requested VERUM, NiKoLaS, ADAM, and ENGEL on the personal site on 22 October 2026. Public project overviews and contribution placeholders are authorized. The user supplied personal contribution details for all four projects in the follow-up. `/work.html` uses `src/_data/work.json` and is linked from Selected research and the Research page.

```yaml
id: project-slug
name: Official public name
tagline: A short goal
theme: Research themes
status: Published project status
statusKey: ongoing # or completed, for styling
period: Published consortium period
summary: Paraphrased public objective
focus: [Short topic labels]
contributions: [] # empty shows "More on my work here soon."
sources:
  - label: Official project page
    url: https://official-institution.example/project
photos: [] # optional src and descriptive alt
photosCaption: Optional project-specific caption
thanks: [] # optional names and profile URLs
preview: {} # optional src, poster, width, height, duration, alt, caption
outputs: [] # optional research links with label and url
collaborators: [] # optional name, role, and url
```

All four projects now include user-confirmed contributions: VERUM covers datasets, semantic/panoptic training, end-user use and feedback during development of a custom Radix version that now serves as a foundation for ENGEL, and SSP; NiKoLaS covers the infrared perception pipeline and DAV3 depth, supporting downstream motion forecasting, with Max included in the linked thanks; ADAM covers acquisition through training, MultiFly, VoxelFix, and pre-flight map checks; ENGEL covers aerial perception, landing-spot detection, static/live map fusion, refinement of Radix-based mapping and map serving for real-time on-board use, segmentation model quantization/deployment with TensorRT and Triton, hardware-in-the-loop CI/CD testing with an Orin runner, and ROS2Bench interface design between upstream and downstream components. SSP, MultiFly, and VoxelFix are linked as research outputs. ADAM also retains the two previously supplied photographs. Do not derive additional personal responsibilities from consortium descriptions.

Public status sources, checked 22 October 2026:

- VERUM: the project GitHub organization lists 2023-2025 and describes the project in the past tense: https://github.com/ProjectVERUM
- NiKoLaS: Fraunhofer FHR lists October 2023-September 2026. The label is "Published term ended" pending confirmation of completion or an extension: https://www.fhr.fraunhofer.de/en/projects/03_industrial_applications/nikolas-non-cooperative-collision-avoidance-for-aircraft.html
- ADAM: KAMO lists September 2023-December 2026. Its final presentation was in October 2026. It is currently labeled "Final phase": https://www.kamo.one/adam/
- ENGEL: TUM lists it among ongoing research projects. An exact end date is not shown: https://www.asg.ed.tum.de/en/ht/research/ongoing-research-projects/engel-energy-efficient-flight-guidance/
- Public objectives also come from the supplied IVI overview: https://www.ivi.fraunhofer.de/de/forschungsfelder/advanced-air-mobility/autonomes-fliegen.html

These consortium dates are not personal employment or participation dates. Keep confidential information outside the checkout. Do not commit internal reports or imagery.
