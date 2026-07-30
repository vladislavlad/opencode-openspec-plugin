## Context

The plugin reads specs as one level of directories under `openspec/specs/`. The CLI reads them recursively (`discoverSpecFiles`) and identifies a spec by its path from the specs root — `backend/auth`, not `auth`. This change closes that gap and gives the sidebar a way to browse grouped specs, then teaches config and derive to produce grouping.

Four modules must agree on what an area is: parsing, the specs component, the sidebar, and the derive prompt. The agreement is deliberately thin — an area is a directory that holds no `spec.md` of its own.

## Goals / Non-Goals

**Goals:**
- Read what the CLI writes, including grouped layouts, with no new CLI dependency
- Browse areas by navigating into them, at any depth
- Let the user choose spec organization during config
- Fill areas one at a time during derive, so context stays small

**Non-Goals:**
- Generating trees deeper than one area level
- Area CRUD from the plugin
- Changing spec.md parsing

## Decisions

### 1. Structure Comes From The File System, Not From The Setting

Discovery is a recursive walk: a directory with `spec.md` is a capability, a directory without one is a grouping level. `specStructure` in config steers derive and nothing else. The data model always reflects the files on disk.

**Alternative considered:** treat `specStructure: hierarchical` as the switch that enables grouping. Rejected — the setting and the files drift apart the moment anyone moves a directory, and the sidebar would then lie about what exists.

### 2. Spec Name Is Its Path; The Tree Is Derived

`OpenSpecSummary.specs` stays a single flat array holding every spec at every depth, with `name` set to the path from `specs/` (`backend/auth`). No `areas` field is added.

This falls out of what already exists in the sidebar: spec selection is `specs.find(s => s.name === selected)`, search runs over `specs`, and the section counter is the length of the search result. A parallel `areas[]` array with bare capability names would break all three at once, and would make `backend/auth` and `web/auth` the same spec.

The tree the UI draws is a pure function of those names — `buildTree(specs)` next to the views, per the house rule that a decision worth testing becomes a plain function rather than a memo inside `sidebar.tsx`. `summaryEquals` and poll deduplication need no change at all.

**Alternative considered:** `areas: Area[]` in the summary alongside a flat-only `specs[]`. Rejected for the three breakages above; the grouping is display state, and storing it duplicates the truth already carried by the names.

### 3. One Recursive Node, Groups Labelled Once An Area Is In Play

The specs component renders a node: the sub-areas at this level and the capabilities at this level, each group under a heading naming it and counting that level — `Areas: N`, `Capabilities: N`.

The headings are there to label groups, so they appear only when there are groups to label: the node has areas of its own, or it is itself inside one. At the root of a project with no areas there is nothing to divide, and the list stays exactly what it is today.

The root and any area are the same node rendered by the same code, and the rule above is one expression over the node rather than a branch per case.

### 4. Entering An Area Is Navigation, Not Expansion

Clicking an area sets the current area path and redraws the section one level down, under a header whose `Area` label shares a row with the back control and whose path sits on the row below — a nested path is long enough to wrap into the control otherwise. Back returns to the parent, not to the root. The current area is mutually exclusive with the spec and requirement selections, like every other detail view in the sidebar.

**Alternative considered:** collapsible groups expanded in place. Rejected — with arbitrary depth the list turns into a tree the user has to scroll past, and it needs its own persisted expansion state; navigation reuses the state machine the sidebar already has.

### 5. UI Reads Any Depth, Config And Derive Write One

Recursion costs the UI nothing: the same node handles depth 1 and depth 3. Derive and config stay at `specs/<area>/<capability>/spec.md`, matching how the rest of the OpenSpec toolchain is used. A deeper tree created by hand still browses correctly.

### 6. Search Stays Global; A Query Flattens The Tree

Search runs over the whole flat list at every level — it needs no change at all once names carry their paths, because `specText` already covers the name and `stripSyntax` leaves `/` alone. Matching an area therefore comes for free: the query hits the area segment and returns everything under it.

Being global, a query has to leave area context: with a non-empty query the section drops the grouping, shows one flat list of matches, and hides the `Area:` line and back control, because the results below them are not that area's. Rows in that list carry their full path — two capabilities named `auth` in different areas would otherwise be indistinguishable. Clearing the query restores the area, its line and the tree.

**Alternative considered:** scope the query to the current area. Rejected — a user three levels in would search and find nothing, with no hint that the match exists elsewhere.

## Risks / Trade-offs

- **Poll cost**: `readOpenSpec` re-runs on every poll, and recursion adds a directory listing per level. Mitigation: try `read(<dir>/spec.md)` first — the call the code already makes — and only list a directory when that read comes back empty. Flat projects keep exactly today's call count.
- **Name is a path, display is a leaf**: rows show the last segment, while the id used for selection and CLI parity is the full path. Both must be stated in the specs, or the two drift.
- **Config drift**: `specStructure` can go stale when files are restructured by hand. It only steers derive, and derive re-reads the actual layout, so a stale value costs at most one extra question.
- **Depth mismatch**: the UI browses deeper trees than derive can create. This is deliberate and stated as a non-goal rather than enforced.

## Migration Plan

Additive. A flat project produces one node with no sub-areas, which renders as the list it renders today. Nothing is rewritten on disk, and nothing is migrated.
