# AGENTS.md

OpenCode TUI plugin that embeds OpenSpec in the terminal sidebar: browse specs, track change proposals, drive the OpenSpec flow, and self-update. SolidJS JSX (compiled by `@opentui/solid`), bundled with Bun.

## Commands
- `bun run typecheck` – types; run before finishing
- `bun run build` – bundle to `dist/index.js`; run before finishing
- `bun run test` – unit tests (needs `--preload @opentui/solid/preload` for the `.tsx` render tests)

## Layout
- `src/index.tsx` – entry; registers the palette commands and the `sidebar_content` slot
- `src/features/commands.ts` – the plugin's own `/opsx-config` and `/opsx-baseline` palette commands; reports back whether baseline registered
- `src/sidebar.tsx` – sidebar root: **the** poll, **the** owner of `busy`, every signal, plus navigation and the three sections
- `src/components/` – UI on props, no polling of their own: `primitives` (Button, Divider, rows, gates), `changes`, `specs`, `search`, `settings`, `init-flow`, `update-flow`
- `src/lib/` – logic:
  - `spec-driven` – the spec.md model + parser for that schema
  - `change-docs` – the markdown a change carries next to tasks.md (proposal.md, design.md): `##` sections and the collapsed teaser
  - `openspec` – reads the openspec dir (tasks, specs, tooling) into the polled summary; `specs/` is walked recursively, so a spec's name is its path from `specs/` and the summary stays one flat list
  - `config` – the plugin's `plugin:` block in `openspec/config.yaml` (init marker, update flag), read and written in one place
  - `prompt-style` – rules every prompt obeys · `config-prompt` · `derive-prompt` · `init-prompts` · `update-prompt`
  - `updates` – npm version checks · `migrations` – the MIGRATIONS table and the post-update prompt
  - `local-fs` – guarded `node:fs` access · `delete-change`
  - `version` / `version-history` – the build constant, the last version seen in `kv`, and `decideMigration`
  - `search`, `send-prompt`, `theme`

## Capability ↔ module
Specs live in `openspec/specs/`, one directory per capability, cut vertically: a feature owns its
behavior, its prompts and its own widgets. A project may group them one level deep – `specs/<area>/<capability>/`
– and a capability's id is its path from `specs/`, so moving it between areas renames it. Keep this
table true – requirements drifted into the wrong specs last time precisely because nothing wrote the
mapping down.

| Capability | Modules |
| --- | --- |
| `openspec-parsing` | `lib/openspec`, `lib/spec-driven`, `lib/change-docs` |
| `plugin-lifecycle` | `index.tsx`, `lib/local-fs`, `lib/config`, `lib/delete-change` |
| `update-flow` | `lib/updates`, `lib/version`, `lib/version-history`, `lib/migrations`, `lib/update-prompt`, `components/update-flow` |
| `init-flow` | `lib/init-prompts`, `components/init-flow` |
| `project-config` | `lib/config-prompt` |
| `spec-derivation` | `lib/derive-prompt` |
| `prompt-style` | `lib/prompt-style` |
| `slash-commands` | `features/commands` |
| `sidebar-ui` | `sidebar.tsx` |
| `settings-view` | `components/settings` |
| `spec-search` | `lib/search`, `components/search` |
| `change-tracking-ui` · `specs-browser-ui` · `ui-primitives` · `prompt-sending` | `components/changes` · `components/specs` · `components/primitives` · `lib/send-prompt` |

## Workflow
- Build features as OpenSpec changes under `openspec/changes/`. Use the `/opsx-*` commands; follow `openspec/config.yaml` rules.
- `openspec validate <change> --strict` before a change is done.
- Не править файлы в `openspec/specs/` – это делают только `/opsx-sync-specs` и `/opsx-archive`, или по явной просьбе пользователя. Требования живут в дельтах change'а (`openspec/changes/<name>/specs/`) до синхронизации.

## Conventions
- The plugin never shells out. The opencode API is read-only over files, so writes go through `node:fs` via `lib/local-fs.ts` – which only works when the TUI and the project share a filesystem. **Every fs write must degrade to a prompt**: `local-fs` returns `false`/`null` instead of throwing, and the caller hands the job to the agent, who always runs where the files are. Anything long-running, interactive or requiring a shell (npm install, `tui.json`, deriving specs) stays with the agent regardless.
- The plugin owns `plugin.init.in-progress`; the agent owns the stage checkpoints in `plugin.init.done` and the `update-in-progress` flag. Only the agent knows when a stage actually finished.
- Shipping user-facing behavior → add a `MIGRATIONS` entry in `src/lib/migrations.ts`, keyed by the release version: `releaseNotes` (what's new, relayed to the user after update) + `instructions` (post-update steps for the agent, empty if none). Skip for internal-only changes. The file's header comment has the house style for notes. These now reach everyone, not only people who pressed the Update button – see below.
- Two things track the plugin version: `plugin.update-in-progress` in config.yaml (written by an update turn, knows the exact `old`) and `openspec.lastVersion` in `api.kv` (written by the sidebar, catches updates that bypassed the button). The sidebar folds both into one pending range; the flag wins. The `kv` path is live in a dev checkout too – `build.ts` always bakes the `package.json` version in, so bumping it and rebuilding looks exactly like an update. The `"dev"` fallback in `version.ts` only shows up when the module is imported unbuilt, i.e. in tests.
- Anything that hands the agent a turn goes through `submitPrompt` and is wrapped in the `busy` gate.

## Gotchas
- Plugin version = `package.json` `version`, baked into `__PLUGIN_VERSION__` by `build.ts`. CLI version is read from `.opencode/skills/*/SKILL.md` `generatedBy`.
- Never import `@opentui/solid/jsx-runtime` – it spawns a second Solid instance whose effects never flush. JSX goes through `@opentui/solid`'s transform (see `build.ts`).
- `spec-driven.ts` owns parsing the schema (`### Requirement:`, `#### Scenario:`) and `stripSyntax` for the search index. Another schema gets its own module. Components only know how to *highlight* SHALL / WHEN·THEN, not how to parse them.
- The prompt modules (`prompt-style`, `config-prompt`, `derive-prompt`, `init-prompts`, `update-prompt`) may import from `lib/config.ts` and `lib/updates.ts`, never the other way – those two must stay free of prompt text. Among themselves only `init-prompts` imports the others, because the init turn embeds the config and derive bodies.
- The sidebar root owns the poll, `busy` and every signal; `components/*` take props and render. A decision worth testing becomes a plain function next to its views (`setupStage`, `needsInit`, `decideMigration`) rather than a memo buried in `sidebar.tsx`.
