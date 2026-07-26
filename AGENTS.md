# AGENTS.md

OpenCode TUI plugin that embeds OpenSpec in the terminal sidebar: browse specs, review change proposals, drive the OpenSpec flow, and self-update. SolidJS JSX (compiled by `@opentui/solid`), bundled with Bun.

## Commands
- `bun run typecheck` — types; run before finishing
- `bun run build` — bundle to `dist/index.js`; run before finishing
- `bun run test` — unit tests (needs `--preload @opentui/solid/preload` for the `.tsx` render tests)

## Layout
- `src/index.tsx` — entry; registers the `sidebar_content` slot
- `src/sidebar.tsx` — sidebar root: polls the openspec dir, owns UI state
- `src/components/` — UI (`primitives`, `changes`, `specs`, `settings`)
- `src/lib/` — logic: `spec-driven` (the spec.md model + parser for that schema), `openspec` (reads the openspec dir, tasks, summary), `search`, `updates` (version checks), `migrations`, `prompts`, `send-prompt`

## Workflow
- Build features as OpenSpec changes under `openspec/changes/`. Use the `/opsx-*` commands; follow `openspec/config.yaml` rules.
- `openspec validate <change> --strict` before a change is done.

## Conventions
- The plugin is read-only over the filesystem. All mutations (npm install, `config.yaml`, `tui.json`) are done by the agent via prompts, never by the plugin.
- Shipping user-facing behavior → add a `MIGRATIONS` entry in `src/lib/migrations.ts`, keyed by the release version: `releaseNotes` (what's new, relayed to the user after update) + `instructions` (post-update steps for the agent, empty if none). Skip for internal-only changes.

## Gotchas
- Plugin version = `package.json` `version`, baked into `__PLUGIN_VERSION__` by `build.ts`. CLI version is read from `.opencode/skills/*/SKILL.md` `generatedBy`.
- Never import `@opentui/solid/jsx-runtime` — it spawns a second Solid instance whose effects never flush. JSX goes through `@opentui/solid`'s transform (see `build.ts`).
- `spec-driven.ts` is the only place that knows the schema's syntax (`### Requirement:`, SHALL/MUST, WHEN/THEN, markdown); it owns the spec model, the parser and `stripSyntax`. Another schema gets its own module.
