## 1. Parsing — recursive discovery in openspec.ts

- [x] 1.1 Walk `openspec/specs/` recursively: a directory with `spec.md` is a capability, a directory without one is a grouping level. Keep the existing order — try reading `spec.md` first, list a directory only when that read is empty, so flat projects keep today's call count
- [x] 1.2 Name each spec by its path from `specs/` joined with `/`, matching the CLI id; sort the flat list by that name
- [x] 1.3 Confirm `specCount`, `requirementCount` and `summaryEquals` need no change once the list stays flat — add a test for a nested project rather than new comparison code

## 2. UI — the tree and its node in specs.tsx

- [x] 2.1 Add `buildTree(specs)` next to the views: a pure function turning the flat list into nodes of `{ areas, specs }`, keyed by path segment
- [x] 2.2 Render a node: `Areas: N` then `Capabilities: N`, labelled once an area is in play; a project with no areas stays a plain list
- [x] 2.3 Add the area row — leaf name, marker, count of specs at any depth, hover like a spec row, click reporting the full path
- [x] 2.4 `SpecRow` shows the leaf segment inside a node and the full path in a flat list, always reporting the full path on select

## 3. UI — area navigation in sidebar.tsx

- [x] 3.1 Add the current-area signal holding a path; entering an area resets the change, spec and requirement selections
- [x] 3.2 Render the area header — `Area` label sharing a row with the back control, the path on the row below — and back returns to the parent area, root only from a top-level area
- [x] 3.3 Keep the search field first and the header count across all levels
- [x] 3.4 Flatten to a plain match list while the query is non-empty, hiding the area header and back control; restore all three when it is cleared

## 4. Search — confirm area names are matched

- [x] 4.1 Confirm `searchSpecs` needs no change: `specText` already covers `spec.name`, and `stripSyntax` leaves `/` alone on both sides. Cover it with tests — area query, nested segment, full path, and `backend/auth` not matching a query for `web/auth`

## 5. Config prompt — the Spec Structure question

- [x] 5.1 Add the single-select question with Flat / Hierarchical, each option naming the layout it produces
- [x] 5.2 Write the answer as a `specStructure` line in the `context` block, leaving `plugin:` untouched

## 6. Derive prompt — areas mode

- [x] 6.1 Read `specStructure` with the rest of the context before reading code; absent means flat
- [x] 6.2 After the overview pass, offer the switch to areas when the capability list is long enough to warrant it and the project is not already grouped — a judgment from the list, no fixed threshold
- [x] 6.3 Propose areas with their capabilities and confirm them by multi-select, allowing typed areas; stop when nothing is confirmed
- [x] 6.4 Fill one area at a time, spawning a sub-agent per capability under the existing sub-agent rules
- [x] 6.5 Write exactly one area level — `specs/<area>/<capability>/spec.md`

## 7. Migration entry

- [x] 7.1 Add the `0.4.0` MIGRATIONS entry in `src/lib/migrations.ts` — one entry for the whole release, folding this change's highlights in with the other changes shipping in it. No post-update instructions needed

## 8. Verify and build

- [x] 8.1 Run `bun run typecheck` to verify types
- [x] 8.2 Run `bun run build` to bundle
- [x] 8.3 Run `openspec validate add-specs-areas-support --strict`
