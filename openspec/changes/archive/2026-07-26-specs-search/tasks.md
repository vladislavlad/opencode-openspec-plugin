## 1. Search logic

- [x] 1.1 Create `src/lib/search.ts`: query tokenization and spec text assembly from all artifacts (name, title, purpose, requirements, scenarios)
- [x] 1.2 Implement `searchSpecs(specs, query)` – filtering by AND tokens + matched requirement counter for each found specification
- [x] 1.3 Cover with tests in `test/search.test.ts`: empty query, case sensitivity, matches across each artifact, multi-token across different artifacts, requirement counter

## 2. Search field

- [x] 2.1 Create `src/components/search.tsx` with `SearchField` component: "⌕" icon, `<input>` with placeholder in `textMuted` color, "✕" button when query is non-empty
- [x] 2.2 Focus management: click – focus, Esc (`onKeyDown`) and Enter (`onSubmit`) – blur with return to previously focused element via `renderer.currentFocusedRenderable`, same in `onCleanup`
- [x] 2.3 Render tests for field in `test/search-field.test.tsx` via `testRender` (click, input, Esc/Enter, clear); connect `--preload @opentui/solid/preload` to test script
- [x] 2.4 Polish: one-line padding below field, `cursorStyle={{ blinking: false }}`, focus state sync with renderer (`ref` + `focused_renderable` event) + test for "click away and back"

## 3. Sidebar integration

- [x] 3.1 `SpecRow` accepts optional `matchedRequirements` and prints `N matching requirements` when it's greater than zero
- [x] 3.2 In `sidebar.tsx` create query signal and memo `searchSpecs`, render `SearchField` as first element of "Specifications" section, list from result, section counter – its length, empty result – "No matches"
- [x] 3.3 Run `bun run typecheck`, `bun run test`, and `bun run build`

## 4. Search within specification

- [x] 4.1 Extract "✕" into primitive `ClearButton` (right padding, accent fill on hover)
- [x] 4.2 `searchRequirements(reqs, query)` in `src/lib/search.ts` + tests: requirement filtering by their text and scenarios, matched scenario counter
- [x] 4.3 `SpecDetail` renders `SearchField` under the `Requirements` heading, works with shared query signal from `sidebar.tsx` (carry-over on navigation and persistence on return), `RequirementRow` prints `N matching scenarios`
- [x] 4.4 Remove title line with padding and description from `SpecDetail`; drop spec `description` field from `OpenSpecSpec`, `parseSpec`, `specEquals`, search, and tests

## 5. Change screen polish

- [x] 5.1 `ChangeDetail` uses shared `DetailHeader` (with `color` for status) instead of its own header copy – padding matches Specification screen
- [x] 5.2 Draw `Divider` as a box border to container width instead of a string of 37 "─": in narrow sidebar the line wrapped and the remainder read as an extra blank line under each divider
- [x] 5.3 Auto-expand "Completed Changes" section on first appearance of completed changes – like Active Changes and Specifications
- [x] 5.4 Render tests in `test/specs-view.test.tsx`: divider width on narrow sidebar, change-screen padding, `SpecDetail` without title/description, requirement filtering and "No matches", matched requirement counter in `SpecRow`

## 6. Schema keywords out of search

- [x] 6.1 Move spec model and `spec.md` parsing to `src/lib/spec-driven.ts` with a note that it's the `spec-driven` schema; leave `openspec.ts` for directory reading and model re-export
- [x] 6.2 Export from schema module `stripSyntax` – removal of keywords (SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT) and Markdown markup; storage stays as-is, text from file
- [x] 6.3 Apply `stripSyntax` in search to query and indexed text; a query consisting only of keywords finds nothing (unlike an empty query)
- [x] 6.4 Tests: keywords and markup are not searchable, query of only keywords, keyword adjacent to regular word

## 7. Release

- [x] 7.1 Add entry to `MIGRATIONS` (`src/lib/migrations.ts`) for release version: release notes about spec search, no migration steps
