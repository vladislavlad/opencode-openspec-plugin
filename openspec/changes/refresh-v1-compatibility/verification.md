# Verification — 2026-10-22

## Versions

- Target plugin release: 1.0.0 for OpenCode V1; 2.0.0 is reserved for OpenCode V2. The checks and host smoke below were originally run with the provisional local 0.5.0 build. Final 1.0.0 checks are recorded in `../fix-v1-review-findings/verification.md`. Nothing was published.
- OpenCode / SDK: 1.19.4, latest stable 1.x in the npm registry at verification time.
- OpenTUI: 0.4.5, matching the V1 host.
- OpenSpec: 1.14.3, pinned for development and installed globally. All six OpenCode skills carry `generatedBy: "1.14.3"`; existing OpenCode and Claude tooling was refreshed by `openspec update --force`.
- Existing machine OpenCode 2.1.2 and its user configuration were not replaced.

## Automated checks

- `bun install --frozen-lockfile`: passed.
- `bun run lint`, `bun run typecheck`, `bun run build`: passed.
- `bun run test`: 261 passed, 0 failed (18 files); baseline before changes was 245 passed.
- `openspec validate refresh-v1-compatibility --strict`: passed.
- `git diff --check`: passed.
- Bundle includes version 0.5.0, keeps the host renderer external, and does not import the OpenSpec test oracle or `@opentui/solid/jsx-runtime`.

New checks compare task counts and descriptions with the pinned OpenSpec parser, create a real CLI project and change, verify grouping and presentation-only poll changes, and render nested task rows at widths 44 and 28. They cover active/completed action sets, unfinished markers, empty descriptions and empty lists.

## Actual V1 host smoke

Installed `opencode-ai@1.19.4` under `/tmp/openspec-plugin-v1-host` with isolated config, data, cache and state directories. Loaded this repository's `dist/index.js` through the isolated `tui.json` and connected its TUI to a local V1 server with an empty test session. No provider was configured and no model turn was submitted.

Observed:

- Sidebar loads, reads OpenSpec files, lists the fixture change and a specification.
- Opening the fixture shows `1/4 tasks done`, nested `[~]` and empty tasks, original ordered labels, and Apply/Update/Delete.
- Scrolling shows the explanation that only checked tasks count as done.
- Changing `[~]` to `[-]` and `2)` to `3)` on disk updates the open card without changing counts or reopening it.
- Clicking Apply inserts `/opsx-apply task-preview` in the prompt without sending it.
- Completing the remaining checkboxes on disk updates to `4/4`, shows Archive/Update and the review reminder.

This verifies host loading, task rendering, polling and draft-command insertion. Model-driven init/update/archive actions were not executed in the smoke session.

## Existing main-spec warnings

`openspec validate --specs --strict --json` reports 13 pre-existing requirement-length warnings (>500 characters) across six capabilities: init-flow, project-config, prompt-style, sidebar-ui, spec-derivation and update-flow. The remaining nine specs pass. No main spec or `openspec/config.yaml` was changed; requirements for this work remain in the change deltas.

## Scope preservation

Work stays on `main`; no commit, tag, push or publish. The existing primitive split, lint setup, CI checks, archived split-primitives change, AGENTS.md and sidebar tests were preserved. Pre-existing edits in the change-view test remain alongside the new assertions. A temporary backup of the original dirty files was made before updates.
