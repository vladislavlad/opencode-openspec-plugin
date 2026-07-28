## Decisions

### Three sections and default expanded states

Rendering `proposal.md` as continuous text above tasks is not possible – at ~40 columns wide, tasks will scroll off-screen. Collapsing only costs space for whoever expands it. The order Proposal → Design → Tasks mirrors the order a change is read.

`Tasks` is open – otherwise regression. `Proposal` is collapsed with a teaser from the beginning of `## Why`: a bare heading would hide the feature, an expanded section returns a wall of text. Teaser – two lines via `collapsedSummary`. `Design` is collapsed without a teaser: the first lines of design.md are usually general words.

### Teaser is measured in characters

A markdown paragraph is one file line, a dozen terminal lines. Budget ≈88 characters, truncation at word boundary with ellipsis. A second paragraph does not enter the teaser.

### Proposal sections are not hardcoded

All sections of `proposal.md` are rendered in file order, except `## Capabilities` – it is a list of deltas, which will have its own section.

### Missing design.md hides the entire section

`design.md` is optional; a "Design ✗" line is noise. `proposal.md` is required: its absence is shown with a muted message.

### Reading on open

The poll every 3 seconds already reads `tasks.md`. Two additional reads would double the cycle for data on one screen. Artifacts are read once: directory `list` + files. Content is not refreshed – acceptable, files are written once.

### Common section parser

Parsing – "split markdown by `##`, respecting code blocks" – is the same technique as in `spec-driven.ts`. Module `lib/change-docs.ts` returns a list of sections; selection by name is done by the caller. The `Markdown` primitive renders headings, bullets, code, and paragraphs; tables, links, and nested lists are not supported – terminal lines are narrow.

### Counter and indentation

Task counter – in the header `Tasks: done/total`, saving a line. Group heading – on column zero, tasks – indented.

## Risks

- **Long `design.md` when expanded.** The sidebar scrolls; if it becomes painful – render only a table of contents.
- **Teaser without Why.** No teaser will appear, the section heading remains bare.
