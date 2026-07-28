## Why

The user doesn't know when a new version of the plugin (`@vladislavlad/opencode-openspec-plugin`) or openspec CLI (`@fission-ai/openspec`) is available. We need to check for updates on sidebar load, offer installation, and run migrations after reload.

## What Changes

- On sidebar load, **asynchronously** (without blocking render) check npm registry for new plugin and CLI versions; 3s timeout, errors silently ignored
- Current versions: plugin – build constant `__PLUGIN_VERSION__`; CLI – `metadata.generatedBy` from `.opencode/skills/*/SKILL.md`
- Latest versions: GET to `registry.npmjs.org` for both packages (scoped names encoded as `%2F`)
- Banner above Explore/Propose buttons: text in `textMuted`, Dismiss (`warn`) and Settings (`accent`) buttons
- Settings button in header – `accent` on hover; if an update is available, permanent `accent`
- Settings screen: versions section (Plugin, OpenSpec CLI), **separate** Update, Check Versions, Update All buttons
- Check Versions – instant plugin re-check (no agent); Update / Update All – direct prompt to agent via `sendPrompt` (like Init), without registering palette commands
- Plugin update = editing the version specifier in `tui.json` (not npm); CLI update = `npm i -g @fission-ai/openspec@<ver>` + `openspec update --force`
- After plugin update, agent writes `plugin.update-in-progress: { old, new }` to config.yaml; on reload the plugin shows a "Run checks after update" banner with Complete Update button
- Migrations are stored in plugin code (`migrations.ts`) as instructions for the agent

## Capabilities

### New Capabilities
- `version-tracking`: check updates via npm registry, update plugin through `tui.json` and CLI through npm + `openspec update --force`, post-reload migrations via `plugin.update-in-progress` flag in config.yaml.

### Modified Capabilities
- `sidebar-ui`: update banner above action row; Settings button on hover – `accent`; "Run checks after update" banner with Complete Update
- `settings-view`: versions section – plugin and CLI, available updates, separate Update, Check Versions, Update All buttons

## Impact

- `src/lib/updates.ts` – `fetchLatest(pkg)`, `readCliVersion` (parsing `generatedBy`), `readUpdateFlag` (reading config.yaml), version comparison, module-level state store
- `src/lib/migrations.ts` – map of version → migration instruction for agent
- `src/lib/prompts.ts` – `buildUpdatePrompt({ plugin?, cli? })`, `buildMigrationPrompt(range)`
- `src/components/settings.tsx` – versions section in Settings screen
- `src/sidebar.tsx` – update signals, banner UI, post-update banner with Complete Update, wire buttons to `sendPrompt`
- `package.json` – `yaml` dependency for parsing config.yaml
- Network: HTTP requests to npm registry (`registry.npmjs.org`)

## Non-goals

- We don't install updates automatically – only warn and offer
- No periodic background polling – check on sidebar load and via Check Versions button
- Don't block plugin operation when network is unavailable
- Don't register palette commands for update/check – everything is called from the panel
- Update, Update All, and Complete Update are blocked while agent is busy (busy); on click – toast "Wait until the agent finishes working"
- We don't determine package manager in the plugin or parse lock files – installation is done by the agent; current versions are read directly
