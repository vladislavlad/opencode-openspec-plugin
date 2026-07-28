## Why

The `MIGRATIONS` mechanism is triggered by exactly one path: the Update button in Settings asks the agent to write `plugin.update-in-progress` into `openspec/config.yaml`, after restart the sidebar sees the flag and offers Complete Update.

You can update past this button in at least three ways, all common:

- `npm i -g` / editing `tui.json` by hand;
- version-less specifier (`"@vladislavlad/opencode-openspec-plugin"`) – opencode pulls the fresh version from npm itself on next launch;
- reinstalling an environment where `tui.json` already points to a new version.

In all three cases, there's no flag in config.yaml. Meaning `instructions` don't execute, and release notes are never seen by the user **ever** – even though the plugin has updated and behaves differently. Effectively, the mechanism only works for those who press our button, i.e. a minority.

The plugin knows everything anyway: `VERSION` is baked into the build, and `TuiPluginApi.kv` survives restarts and isn't used by anyone. A comparison is enough to catch any update.

## What Changes

- The plugin remembers its version in `kv` under key `openspec.lastVersion` and compares it on startup with `VERSION` from the build
- Version in `kv` grew → this is an update past the button; the same range `(last, VERSION]` is assembled as for the flag, and Complete Update is offered
- No entry in `kv` (first launch of a build that can do this) → version is written silently, no banner shown: where the user came from is unknown, and dumping all release notes on them isn't right
- Version matched or rolled back → version is written silently, no banner shown
- The `kv` banner only shows if there's at least one `MIGRATIONS` entry in range: on a patch release without release notes, there's nothing to show, the version is just recorded
- The flag `plugin.update-in-progress` remains the priority source: it knows the exact `old` version you left from, while `kv` only knows the last launched. Both sources fold into one "pending range", single UI
- Migration prompt for a `kv` range doesn't contain a requirement to remove `plugin.update-in-progress` – there's nothing to remove
- `kv` updates to `VERSION` when the Complete Update turn finished – by the same busy→idle transition that already tracks setup completion and restart invitation

## Capabilities

### Added Capabilities
- `plugin-lifecycle`: recording and reading last launched plugin version through `kv`, detecting version change on startup

### Modified Capabilities
- `sidebar-ui`: post-update banner feeds from two sources (config.yaml flag and version drift in `kv`), flag takes priority; after migration turn, sidebar records version to `kv`

## Impact

- `src/lib/version-history.ts` – new module: `readLastVersion(api)`, `recordVersion(api)`, `kv` key, "forward only" rule in `pendingVersionRange`
- `src/lib/version-history.ts` – `decideMigration({ flag, last, current, hasEntries })`: entire outcome table as one pure function, outside Solid. Inside the sidebar it couldn't be tested other than with a live TUI
- `src/lib/migrations.ts` – `hasMigrations(old, next)` for deciding "whether to show banner from `kv`"
- `src/lib/migrations.ts` – `buildMigrationPrompt(range, { clearFlag })`: flag removal line only when the flag actually exists
- `src/sidebar.tsx` – version signal from `kv`, memo over `decideMigration`, two banner branches instead of nested `Show`, version recording on turn completion
- `test/version-history.test.ts` – `kv` read/write and table test for decision: two sources × (first launch / match / growth / rollback / range without entries)
- `test/migrations.test.ts` – range assembly, presence/absence of flag removal line
- `src/lib/migrations.ts` – `MIGRATIONS` entry about the release (user-facing behavior change)

## Non-goals

- Don't show release notes retroactively to those who don't yet have entries in `kv`: the range would be made up
- Don't add Dismiss alongside Complete Update. That's a second exit path, its own state, and its own branch "what if there's also a flag in config.yaml" – while the cost of pressing is already one cheap agent turn. If the banner turns out intrusive, we'll add it separately
- Don't move `plugin.update-in-progress` to `kv`: the flag survives machine changes along with the repository and remains the only thing that knows `old` exactly
- Don't touch npm version checks and update buttons – only what happens **after** a new build has already loaded is changed
- Don't store CLI version in `kv`: it's read from `generatedBy` on disk and doesn't participate in plugin migrations
