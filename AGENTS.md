# AGENTS.md

OpenCode TUI plugin that embeds OpenSpec in the terminal sidebar: browse specs, track change proposals, drive the OpenSpec flow, and self-update. SolidJS JSX (compiled by `@opentui/solid`), bundled with Bun.

## Commands
- `bun run typecheck` — types; run before finishing
- `bun run build` — bundle to `dist/index.js`; run before finishing
- `bun run test` — unit tests (needs `--preload @opentui/solid/preload` for the `.tsx` render tests)

## Layout
- `src/index.tsx` — entry; registers the `sidebar_content` slot
- `src/sidebar.tsx` — sidebar root: polls the openspec dir, owns UI state, switches between the list and the detail views
- `src/components/` — UI: `primitives` (Button, Divider, rows, gates), `changes`, `specs`, `search`, `settings`
- `src/lib/` — logic:
  - `spec-driven` — the spec.md model + parser for that schema
  - `openspec` — reads the openspec dir (tasks, specs, tooling) into the polled summary
  - `config` — the plugin's `plugin:` block in `openspec/config.yaml` (init marker, update flag)
  - `updates` — npm version checks · `migrations` — post-update prompts · `prompts` — every prompt text
  - `local-fs` — guarded `node:fs` access · `delete-change`
  - `version` / `version-history` — the build constant and the last version seen, in `kv`
  - `search`, `send-prompt`, `theme`

## Workflow
- Build features as OpenSpec changes under `openspec/changes/`. Use the `/opsx-*` commands; follow `openspec/config.yaml` rules.
- `openspec validate <change> --strict` before a change is done.

## Conventions
- The plugin never shells out. The opencode API is read-only over files, so writes go through `node:fs` via `lib/local-fs.ts` — which only works when the TUI and the project share a filesystem. **Every fs write must degrade to a prompt**: `local-fs` returns `false`/`null` instead of throwing, and the caller hands the job to the agent, who always runs where the files are. Anything long-running, interactive or requiring a shell (npm install, `tui.json`, deriving specs) stays with the agent regardless.
- The plugin owns `plugin.init.in-progress`; the agent owns the stage checkpoints in `plugin.init.done` and the `update-in-progress` flag. Only the agent knows when a stage actually finished.
- Shipping user-facing behavior → add a `MIGRATIONS` entry in `src/lib/migrations.ts`, keyed by the release version: `releaseNotes` (what's new, relayed to the user after update) + `instructions` (post-update steps for the agent, empty if none). Skip for internal-only changes. The file's header comment has the house style for notes. These now reach everyone, not only people who pressed the Update button — see below.
- Two things track the plugin version: `plugin.update-in-progress` in config.yaml (written by an update turn, knows the exact `old`) and `openspec.lastVersion` in `api.kv` (written by the sidebar, catches updates that bypassed the button). The sidebar folds both into one pending range; the flag wins. A dev checkout has `VERSION === "dev"`, so the `kv` path stays inert there.
- Anything that hands the agent a turn goes through `submitPrompt` and is wrapped in the `busy` gate.

## Gotchas
- Plugin version = `package.json` `version`, baked into `__PLUGIN_VERSION__` by `build.ts`. CLI version is read from `.opencode/skills/*/SKILL.md` `generatedBy`.
- Never import `@opentui/solid/jsx-runtime` — it spawns a second Solid instance whose effects never flush. JSX goes through `@opentui/solid`'s transform (see `build.ts`).
- `spec-driven.ts` owns parsing the schema (`### Requirement:`, `#### Scenario:`) and `stripSyntax` for the search index. Another schema gets its own module. Components only know how to *highlight* SHALL / WHEN·THEN, not how to parse them.
- `lib/prompts.ts` may import from `lib/config.ts` and `lib/updates.ts`, never the other way — those two must stay free of prompt text.
