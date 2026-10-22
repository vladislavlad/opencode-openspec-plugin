## Why

`primitives.tsx` is 308 lines of loosely related components, types, and helpers in one file. Adding or modifying a single primitive requires scrolling past unrelated code, and the barrel import surface grows with every new addition. Splitting into focused files improves navigability and makes future additions self-contained.

## What Changes

- Replace `src/components/primitives.tsx` (single 308-line file) with `src/components/primitives/` directory
- Create a barrel `index.ts` that re-exports everything — external importers remain unchanged (`from "./components/primitives"`)
- Split into 10 focused files by cohesion:

| File | Contents |
| --- | --- |
| `gate.ts` | `Gate` type |
| `hover.ts` | `HoverState` type + `rowHover()` helper |
| `button.ts` | `Button` component |
| `buttons.ts` | `BackButton`, `ClearButton` (both use `Button`) |
| `layout.ts` | `Divider`, `CollapsibleSection`, `ProgressBar` |
| `detail.ts` | `DetailHeader` (uses `BackButton` + `Divider`) |
| `paragraph.ts` | `Paragraph` + internal `stripBold`, `splitShall` |
| `markdown.ts` | `Markdown` + internal `mdBlocks`, regex constants |
| `init.ts` | `NotInitialised` (uses `Button`) |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — no spec-level behavior changes; this is a pure file-structure refactor. The change declares `skip_specs: true`.

## Impact

- **Affected files**: `src/components/primitives.tsx` (deleted), 10 new files under `src/components/primitives/`
- **External importers** (`sidebar.tsx`, `search.tsx`, `update-flow.tsx`, `init-flow.tsx`, `specs.tsx`, `settings.tsx`) — no changes needed; barrel re-exports preserve the same import path and names
- **No API, runtime, or build changes**

## Non-Goals

- Renaming components or changing their interfaces
- Adding new primitives or modifying existing behavior
- Consolidating other monolithic files (e.g., `changes.tsx`, `specs.tsx`) — that's a separate effort
