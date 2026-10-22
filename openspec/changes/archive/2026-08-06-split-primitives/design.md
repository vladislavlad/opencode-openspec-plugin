## Context

`src/components/primitives.tsx` contains 10 exports (2 types, 1 helper, 7 components) and 3 internal functions in a single 308-line file. Six other files import from it via `from "./components/primitives"`. The barrel import path must remain stable — external consumers cannot change their imports.

## Goals / Non-Goals

**Goals:**
- Each export lives in its own file grouped by cohesion
- A barrel `index.ts` re-exports everything so existing importers require zero changes
- Internal dependencies between primitives resolve via relative paths within the directory

**Non-Goals:**
- Renaming exports or changing component interfaces
- Modifying rendering behavior or adding new components

## Decisions

1. **Directory structure over flat files** — `src/components/primitives/` keeps the import path `"./components/primitives"` resolving to the barrel, matching how Node/Solid resolve directory imports.

2. **Barrel re-exports all names** — `index.ts` uses `export { ... } from "./gate"` etc., preserving the single-line import style in consumers (`import { Button, type Gate } from "./components/primitives"`).

3. **Internal deps use relative paths** — e.g., `buttons.ts` imports `{ Button } from "./button"`, not from the barrel, to avoid circular re-export chains.

## Risks / Trade-offs

- [Circular import risk] → Mitigation: no file imports from `index.ts`; internal deps go direct (`./button`, `./hover`). The dependency graph is a DAG with no cycles.
- [Build tool resolution] — Solid/Babel must resolve `import { ... } from "./components/primitives"` to the new directory's `index.ts`. Mitigation: Node and bundlers already support this convention; verify with `bun run build` after refactor.

## Migration Plan

Not applicable — single-change refactor, no deployment or rollback needed. Verify with `bun run lint`, `bun run typecheck`, `bun run build`.
