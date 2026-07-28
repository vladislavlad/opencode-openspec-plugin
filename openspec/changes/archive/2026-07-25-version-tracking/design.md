## Context

The plugin integrates with openspec CLI through instruction files in `.opencode/`. When the CLI or the plugin itself is updated, the user doesn't know that a new version is available. The current approach is manual execution.

The plugin runs in a Bun host with access to Node (`node:fs` is already used for deleting change directories), so on sidebar load it can make an HTTP request to npm registry. The plugin is **read-only**: it reads versions, queries the registry, and sends prompts; all writes (npm install, editing `tui.json`, flag in config.yaml, migrations) are performed by the agent, which has shell access.

Both current versions are determined without shell and without parsing lock files:
- **Plugin** – build constant `__PLUGIN_VERSION__` (baked into `build.ts` via `define`, exported as `VERSION`).
- **CLI** – the `metadata.generatedBy` field in any `.opencode/skills/*/SKILL.md`. This is the CLI version that generated on-disk instructions; it's meaningful to compare with npm latest to determine "files are outdated".

Latest versions for both packages are fetched the same way – GET to `registry.npmjs.org`. The Settings screen already exists (archived change `header-version-settings`) and displays the plugin version – it needs to be extended with an updates section.

After a plugin update, the agent writes `plugin.update-in-progress: { old, new }` to config.yaml so that on reload the plugin knows migrations need to run. Migrations are stored as instructions for the agent in `migrations.ts`.

## Goals / Non-Goals

**Goals:**
- Asynchronously, without blocking render, check for plugin and CLI updates via npm registry on sidebar load
- Display a warning banner above action buttons if an update is available
- Extend Settings screen with a versions section featuring separate Update, Check Versions, Update All buttons
- Update plugin by editing `tui.json`, CLI – via npm + `openspec update --force`
- After reload, detect `plugin.update-in-progress` in config.yaml and offer to run migrations

**Non-Goals:**
- Automatic installation of updates – only offering to the user
- Periodic background polling – check on load and via Check Versions button
- Blocking plugin operation when network is unavailable
- Determining package manager and parsing lock files in the plugin – agent handles installation
- Registering palette commands for update/check – everything is called from the panel

## Decisions

### D1: Version check via npm registry
**Decision:** A single function `fetchLatest(pkg)` – HTTP GET to `registry.npmjs.org/<pkg>/latest`, returns `.version`. Called twice: `@vladislavlad%2Fopencode-openspec-plugin` and `@fission-ai%2Fopenspec` (scoped names are URL-encoded, `/` → `%2F`). Compared with current: plugin – `__PLUGIN_VERSION__`, CLI – `generatedBy`.

**Alternatives considered:**
- Full package document (all tags) – excessive, only need `latest`
- Check via GitHub releases – depends on where the package is published

### D2: Current CLI version from `generatedBy`, not from lock files
**Decision:** CLI is installed globally (binary on PATH), it's not in the project lock file, and shell isn't used from the plugin. So we read the current CLI version from `metadata.generatedBy` in `.opencode/skills/*/SKILL.md` (regex `/generatedBy:\s*"([^"]+)"/`). If no SKILL.md is found – CLI shows as "unknown", CLI update check is skipped.

**Alternatives considered:**
- Determine package manager + parse lock files – three different formats, fragile, and for global CLI there's no lock entry
- `openspec --version` via shell – plugin intentionally has no shell; agent handles installation/CLI commands

### D3: Banner above action buttons, not below
**Decision:** Banner is placed between the header row (OpenSpec + version + Settings) and the action row (Explore/Propose). Text in `textMuted`, Dismiss (`warn`) and Settings (`accent`) buttons.

**Alternatives considered:**
- Below action buttons – less visible, easy to miss
- Toast notification – no action, easy to miss

### D4: Updates via direct prompts through `sendPrompt`, not palette commands
**Decision:** Update, Update All, and Complete Update build a prompt string in code and send it to the agent via `sendPrompt(api, prompt, { clear: true, submit: true })` – same pattern as Init button (`initOpenSpec` + `OPENSPEC_INIT_PROMPT`). Check Versions is a plugin function `checkVersions()` (fetch), no agent turn. No new commands registered in the palette.

**Alternatives considered:**
- Ephemeral `/opsx-*` commands – clutter the command list, and calling them separately from the palette makes no sense (checking and updating only make sense from the panel with versions already displayed)
- Direct shell from plugin – plugin has no shell, agent does everything

### D5: update-in-progress flag in config.yaml
**Decision:** On plugin update, the agent writes `plugin.update-in-progress` with `old`/`new` fields. On reload, the plugin reads the flag (dep `yaml`) and shows a "Run checks after update" banner + Complete Update. The flag is written **only on plugin version change**; CLI-only updates don't use it. The agent clears the flag – as the last step of the Complete Update prompt.

**Alternatives considered:**
- Separate file `.opencode/.update-status` – extra file, harder to maintain
- Browser memory – lost on opencode restart

### D6: Migrations as instructions for the agent
**Decision:** `migrations.ts` contains a map of version → instruction string. `collectMigrations(old, new)` concatenates instructions for range `(old, new]`; `buildMigrationPrompt` forms the final prompt. Complete Update sends it directly to the agent (`sendPrompt`). No instructions for the range → minimal prompt "check versions and clear flag".

**Alternatives considered:**
- Separate skill for each migration – excessive, hard to maintain
- Code migrations in plugin – limited by plugin capabilities (no shell)

### D7: Settings button on hover – `accent` color
**Decision:** On hover over the header row, the Settings button changes from `textMuted` to `accent`. If an update is available, the button stays `accent` permanently.

**Alternatives considered:**
- Color `warn` (as before) – associated with error, not action
- Permanent `accent` without hover – draws unnecessary attention

### D8: Different update mechanisms for plugin and CLI
**Decision:** Plugin is connected via `tui.json` (`"plugin": [...]`), so update = editing the specifier to `@vladislavlad/opencode-openspec-plugin@<new>` (opencode will pull the version on restart), **without npm**. CLI – global npm binary, so `npm i -g @fission-ai/openspec@<new>` (agent determines actual PM) + `openspec update --force` (regenerates `.opencode/commands` and `.opencode/skills`, bumps `generatedBy`). If the `tui.json` entry is a local path (dev mode), the plugin block is skipped.

**Alternatives considered:**
- `npm i -g` for plugin – plugin is not a global package, connected via `tui.json`
- Manual CLI file regeneration – there's a standard `openspec update` command

### D9: `buildUpdatePrompt` composes independent blocks
**Decision:** Prompt = INTRO + [PLUGIN block?] + [CLI block?] + FOOTER (reload, once). Blocks are self-contained and don't overlap (plugin touches `tui.json`, CLI – npm + `.opencode`), so Update All is simply conditional inclusion of both blocks, without special stitching logic. The `update-in-progress` flag lives only in the PLUGIN block.

**Alternatives considered:**
- Separate prompts + manual concatenation for "both at once" – text duplication and risk of footer/flag desync

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| npm registry unavailable or slow | 3s timeout (`AbortController`); on error – silently ignore, don't show banner |
| `fetch` unavailable in plugin host runtime | Check first; fallback – agent checks versions via bash (`npm view <pkg> version`) |
| SKILL.md not found / no `generatedBy` | CLI shows as "unknown", CLI update check is skipped |
| User clicked Dismiss and wants to see again | Check Versions button in Settings restarts the check |
| Network request increases sidebar load time | Async fire-and-forget check, UI renders without waiting |
| opencode didn't pick up new plugin version from `tui.json` | On restart `flag.new !== VERSION` → soft hint instead of migrations |
| Agent didn't run migrations correctly | Flag remains until successfully cleared; Complete Update can be invoked again |

## Migration Plan

Not required – feature is additive. On first run after update:
1. If network unavailable – banner not shown, everything works as before
2. After successful check – user sees warning and can update via Settings
3. After opencode reload – with `plugin.update-in-progress` flag, "Run checks after update" banner offers to complete the update
