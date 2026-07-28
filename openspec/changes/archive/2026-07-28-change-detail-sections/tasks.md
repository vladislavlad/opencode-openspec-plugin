## 1. Parsing change artifacts

- [x] 1.1 Module `src/lib/change-docs.ts`: `ChangeDocs` model, parsing markdown by `##` skipping code blocks
- [x] 1.2 Section selection by name and teaser – beginning of first paragraph, truncated to character budget
- [x] 1.3 Tests: section splitting, skipping `##` in code blocks, selection by name, teaser without word truncation

## 2. Reading artifacts on change open

- [x] 2.1 In `src/sidebar.tsx`, read the change directory once on selection: `list` + reading existing files; result into a signal, reset on selection change
- [x] 2.2 Flow data into `ChangeDetail`; while reading is in progress – sections are in place with empty bodies

## 3. Markdown render primitive

- [x] 3.1 `Markdown` in `src/components/primitives.tsx`: headings, bullets, code blocks, paragraphs; blank lines collapse; strip `**` from text
- [x] 3.2 Test: heading, bullet, code block, and paragraph render differently

## 4. Three sections in the change card

- [x] 4.1 `CollapsibleSection`: `count` is optional – without it, a bare label
- [x] 4.2 Proposal / Design / Tasks sections; Tasks open, others collapsed; Design hidden without file; missing proposal.md – muted message
- [x] 4.3 Proposal teaser via `collapsedSummary`: beginning of `Why`, muted color, indentation; character budget (88), word-boundary truncation; click on teaser expands section
- [x] 4.4 Task count – in header `Tasks: done/total`; separate line removed, progress bar remains
- [x] 4.5 Group heading – on column zero; tasks – in marker column
- [x] 4.6 Tests: default expanded states, hidden Design, teaser, counter in header, hanging group heading

## 5. Verification and release

- [x] 5.1 `bun run typecheck`, `bun run test`, `bun run build`
- [x] 5.2 Found defects fixed
- [x] 5.3 Entry in `MIGRATIONS` for version 0.3.1
- [x] 5.4 Update `AGENTS.md`: add `lib/change-docs` to Layout and capabilities table
- [x] 5.5 `openspec validate change-detail-sections --strict`
- [x] 5.6 Version in `package.json` → 0.3.1

## 6. Manual testing

- [x] 6.1 Verify all proposal.md sections in file order (except Capabilities); teaser – from Why or first section
- [x] 6.2 Fix extra empty row: `Markdown` does not render blank lines at edges
- [x] 6.3 Add tests: teaser selection, click on teaser (`mockMouse`), one empty row between Design and Tasks; strip `**`, click expands Proposal
