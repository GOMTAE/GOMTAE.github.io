# Content handoff

These inputs enable future improvements. None blocks the implemented public-content redesign.

## Confirmed in this session

- Leave `images/VoxelFix/teaser.svg` untouched and untracked.
- Include integrated Markdown writing with an initially empty Writing page and no invented articles.
- Use the current official 14-author MultiFly roster. Both arXiv landing page and v2 PDF checked on 2026-10-18 omit Sai B. Matha. The discrepancy noted in the brief is no longer present in the consulted sources. Markus Gross, Andreas Greiner and Taehyoung Kim retain equal-contribution markers; Paul Spannaus retains the correspondence marker.
- Do not publish a MultiFly project page or an unsettled code/dataset URL. Only the authoritative paper is linked.

## Specific optional inputs

1. **Applied work:** For each approved project, provide its official public name/link, your specific responsibility, two or three cleared contributions, and team/student credits. Confirm which text and images are approved for this personal website.
2. **Portrait and CV:** Provide an approved genuine portrait and a current public CV if you want them included. The current template image is not a portrait and is not reused.
3. **RGB/segmentation comparison:** A matched RGB frame and corresponding prediction, with model, capture/frame identifier, class palette, source, and permission. Current figures contain inset comparisons, so a pixel-aligned before/after slider is deliberately not shipped.
4. **MultiFly links:** Provide stable project/code/data destinations once settled. A full project page remains a separate content task.
5. **Writing:** The first authentic post or update can be added using the README instructions. Independent ventures can be added to the separate projects registry once you have approved descriptions and links.

## Institutional project schema

Only an approved entry is rendered by the Applied Work page. Draft entries are not a safe place for private information in a public Git repository. Keep confidential notes outside the checkout.

```yaml
project_name: Official public name
status: ongoing # or completed / archived
organization: Fraunhofer IVI
public_project_url: https://official-institution.example/project
public_summary: Public objective with source
my_role: Confirmed responsibility
my_contributions:
  - User-confirmed contribution cleared for this website
collaboration_note: Accurate team and student credit
assets: [] # approved future assets, with ledger entries
results_and_constraints: Public, sourced statements only
source_and_permission: Public source and explicit approval reference/date
review_state: approved_for_personal_website # draft / withheld are not rendered
```

No ENGEL, VERUM, ADAM, or other institutional program is claimed as personal work merely because it appears in an official overview. The current page includes only public institutional context and the already published research record.
