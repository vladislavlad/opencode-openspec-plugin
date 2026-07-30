## Context

The `buildMigrationPrompt` function in `src/lib/migrations.ts` assembles a multi-stage prompt for post-update actions. Stage 4 outputs release notes grouped by version, currently joining each version's note array with `.join(" ")` into a paragraph under `### ${m.version}` headings. There's no top-level "Release Notes" section heading.

## Goals / Non-Goals

**Goals:**
- Add a `## Release Notes` heading before the per-version notes block
- Render each release note item as a bullet list (`- Item text`) instead of a space-separated paragraph

**Non-Goals:**
- Not changing how `releaseNotes` are stored in the `MIGRATIONS` table (still string array joined at prompt-build time)
- Not affecting agent relay behavior — only the prompt structure changes

## Decisions

1. **Keep `releaseNotes` as string array in MIGRATIONS** — The array structure is convenient for authors to add items one per line. Only change the join format from `.join(" ")` to bullet list rendering in `buildMigrationPrompt`.
2. **Add heading at prompt level, not in individual migrations** — The "Release Notes" heading belongs once before all version blocks, not repeated per migration entry.

## Risks / Trade-offs

- Minimal risk — this is a formatting change with no behavioral impact on the agent's execution of migration steps or flag clearing.
