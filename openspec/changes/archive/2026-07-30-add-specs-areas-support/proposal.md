## Why

OpenSpec stores specs either flat (`specs/<capability>/spec.md`) or grouped into areas (`specs/<area>/<capability>/spec.md`). The CLI discovers both, and a nested spec's id is its path — `backend/auth`. The plugin knows only the flat form: it lists one level of directories, so a project that groups its specs shows a partial or empty Specifications section. Config never asks how the user wants specs organized, and derive has no notion of grouping capabilities before generating them.

## What Changes

- **Parsing** (`openspec.ts`): discover specs recursively under `specs/`, the way the CLI does — a directory holding `spec.md` is a capability, a directory holding other directories is a grouping level. A spec's `name` becomes its path from `specs/` (`backend/auth`), which is also its CLI id. The summary stays one flat list; grouping is derived from those names, not stored.
- **Sidebar UI** (`specs.tsx`, `sidebar.tsx`): the Specifications section renders one recursive node. Its groups sit under `Areas: N` and `Capabilities: N` headings once an area is in play; a project with no areas keeps the plain list it has today. Clicking an area navigates into it and renders the same node one level down, under an area header that shares a row with a back control. The section header count and the search field stay in place at every level.
- **Search** (`search.ts`): a query matches area names too, since the area is part of a spec's name.
- **Config prompt** (`config-prompt.ts`): ask how specs are organized — `Flat` or `Hierarchical` — and record it as `specStructure` in the `context` block.
- **Derive prompt** (`derive-prompt.ts`): read that setting; when the project is large enough for grouping to help, offer to switch. In areas mode, propose the areas found, confirm them with the user via multi-select, then fill one area at a time, spawning a sub-agent per capability inside it.

## Capabilities

### Modified Capabilities
- `openspec-parsing`: recursive spec discovery; a spec's name is its path from `specs/`
- `specs-browser-ui`: one recursive node renders both a grouped and a flat list; area rows
- `sidebar-ui`: the Specifications section navigates into an area and back to its parent
- `spec-search`: area names participate in matching
- `project-config`: config asks for `specStructure` and records it
- `spec-derivation`: derive reads `specStructure`, offers areas mode, fills areas iteratively

## Impact

- `src/lib/openspec.ts` — recursive discovery, path-based spec name
- `src/components/specs.tsx` — the node renderer and the area row
- `src/sidebar.tsx` — current-area state, back to parent, section composition
- `src/lib/search.ts` — area names in the match text
- `src/lib/config-prompt.ts` — the Spec Structure question and its `context` line
- `src/lib/derive-prompt.ts` — areas mode
- `src/lib/spec-driven.ts` — unchanged; spec.md parsing does not move

## Non-goals

- Not changing the spec.md format or its parser
- Not adding an AreaView component — the existing specs component renders every level
- Not creating, renaming or deleting areas from the plugin
- Not producing nested areas: config and derive work with exactly one level (`specs/<area>/<capability>/spec.md`). Deeper trees are read and displayed, never generated
- Not restructuring an existing project's files
