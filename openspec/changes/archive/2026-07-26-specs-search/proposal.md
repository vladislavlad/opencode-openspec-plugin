## Why

The "Specifications" section is a flat list of all project capabilities. On real projects there are dozens, and the requirement you need is usually found by text ("where's archive?", "which spec mentions config.yaml?"), not by directory name. Currently the only way is to open specs one by one and read with your eyes: the plugin already holds all parsed text in memory (Purpose, requirements, scenarios), but doesn't let you search it.

## What Changes

- Above the specifications list in the "Specifications" section a search field appears: muted placeholder "Search specs", icon "⌕", mouse click places cursor and allows typing.
- Input filters the specifications list live; counter in the section header shows number of matches.
- Search covers all spec artifacts: name, H1 title, Purpose, requirement names and descriptions, scenario names and bodies.
- Multi-word query – match on each word (AND), case-insensitive.
- When a match comes from requirements, the spec row shows `N matching requirements` instead of the usual counter.
- Esc and Enter remove focus from the field and return it to the opencode prompt; "✕" on the right clears the query.
- Empty result shows muted "No matches".
- The same field exists inside a specification, above the requirements list: query carries over on navigation, filters requirements (including scenario text), and persists when going back.
- Also removed from spec detail view are the title line (duplicated capability name) and description: there is no text between H1 and the first section in the OpenSpec schema, so it's no longer parsed.
- Divider draws to container width: previously a string of 37 "─" wrapped in narrow sidebar and the remainder read as an extra blank line under each divider.
- The "Completed Changes" section auto-expands on first appearance of completed changes – like Active Changes and Specifications.
- Schema keywords (SHALL, MUST, WHEN, THEN, …) and Markdown markup don't participate in search: they appear in every spec, so queries `shall`, `when`, `**` returned the entire list.
- Parsing `spec.md` moved to the schema module `spec-driven` – when other schemas arrive, each gets its own parser and model.

## Capabilities

### New Capabilities
- `spec-search`: Search across specifications – matching rules over all artifacts and an input field with focus management in the terminal.

### Modified Capabilities
- `sidebar-ui`: The "Specifications" section contains a search field above the list and displays filtered results with match count.
- `specs-browser-ui`: `SpecRow` shows matched requirement count during active query; `SpecDetail` gets a search field above requirements and filters them.
- `ui-primitives`: new primitive `ClearButton` – "✕" with accent highlight on hover; `Divider` draws to container width (previously wrapped in narrow sidebar), `DetailHeader` accepts title color.
- `change-tracking-ui`: change detail card uses shared `DetailHeader`.
- `openspec-parsing`: spec `description` field no longer parsed; parsing moved to the schema module `spec-driven`, which provides a text syntax-stripping function.

## Non-goals

- Do not search changes and tasks – only specs; Active/Completed Changes sections untouched.
- No fuzzy search, relevance ranking, or matched fragment highlighting within text – simple substring match.
- Don't support other OpenSpec schemas – only mark the boundary so they can be added later.
- Don't turn `spec.md` into a rigid structure: requirement and scenario are stored as text, as in the file; keywords are dropped only during matching.
- No hotkey for field focus: mouse only (the plugin has no keymap layer).
- Query is not persisted between sessions (`kv` not used).

## Impact

- `src/lib/spec-driven.ts`: new schema module – spec model and its parser.
- `src/lib/openspec.ts`: remains directory reading and summary assembly, model re-exported.
- `src/lib/search.ts`: new module – query tokenization and matching against specifications.
- `src/components/search.tsx`: new component `SearchField` (input + focus/blur + clear).
- `src/components/primitives.tsx`: new `ClearButton`.
- `src/components/specs.tsx`: `SpecRow` gets matched requirement counter, `SpecDetail` – search field and requirement filtering, `RequirementRow` – matched scenario counter.
- `src/components/changes.tsx`: `ChangeDetail` transitions to shared `DetailHeader`.
- `src/lib/openspec.ts`: `OpenSpecSpec` and `parseSpec` lose the `description` field.
- `src/sidebar.tsx`: query signal, memo with filtered list, field insertion in section, "Completed Changes" auto-expand.
- `test/search.test.ts`: matching rules; `test/search-field.test.tsx`: field behavior via `testRender`; `test/specs-view.test.tsx`: divider, screen padding and filtering in UI.
- `package.json`: test script adds `--preload @opentui/solid/preload` for `.tsx` tests.
- `AGENTS.md`: test command and schema module boundary rule.
- `src/lib/migrations.ts`: release notes entry for the feature version.
