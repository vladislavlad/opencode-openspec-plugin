## 1. Update check – lib

- [x] 1.1 Create `src/lib/updates.ts` – `fetchLatest(pkg)`: HTTP GET to `registry.npmjs.org/<pkg>/latest` (scoped name → `%2F`) with `AbortController` (3s timeout), return `version | null` (error/timeout → `null`)
- [x] 1.2 Add `readCliVersion(client)`: iterate `.opencode/skills/*/SKILL.md`, parse `generatedBy` (regex `/generatedBy:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?/`), return version or `null` ("unknown")
- [x] 1.3 Add `checkVersions(client)`: current plugin = `VERSION`, current CLI = `readCliVersion`; latest for both = `fetchLatest` (parallel, `Promise.all`); comparison via `semverGt`; return `VersionState { pluginCurrent, cliCurrent, reachable, plugin, cli }` (plugin/cli = `{ current, next } | null`). State is held in sidebar signals – a separate module-level store wasn't needed
- [x] 1.4 Add `readUpdateFlag(client)`: read `openspec/config.yaml` (root `openspec`/`.openspec`), parse `plugin.update-in-progress` via dep `yaml`, return `{ old, new } | null`
- [x] 1.5 Add `yaml` dependency to `package.json`

## 2. Update and migration prompts

- [x] 2.1 In `src/lib/prompts.ts` add `buildUpdatePrompt({ plugin?, cli? })`: INTRO + optional PLUGIN block (edit `tui.json` to `@vladislavlad/opencode-openspec-plugin@<next>`, write `plugin.update-in-progress: { old, new }`, skip dev path) + optional CLI block (`npm i -g @fission-ai/openspec@<next>` + `openspec update --force`) + FOOTER (reload, once)
- [x] 2.2 Create `src/lib/migrations.ts` – `MIGRATIONS: Record<version, Migration>`, where `Migration = { instructions, releaseNotes }` + `collectMigrations(old, new)` (range `(old, new]`, with version tag)
- [x] 2.3 Add `buildMigrationPrompt(range)`: agent instructions (`instructions`) from `collectMigrations` + request to tell user what's new (`releaseNotes` by version) + step "clear `plugin.update-in-progress` from config.yaml"; empty range → minimal prompt without steps

## 3. Integrate check into sidebar

- [x] 3.1 Add signals `pluginUpdate`, `cliUpdate`, `cliCurrent`, `updateFlag`, `bannerDismissed`, `reloadPending` in `sidebar.tsx`
- [x] 3.2 Version check (`runVersionCheck`) – once per directory in dir effect, async/fire-and-forget, doesn't block render; `readUpdateFlag` – cheap on every poll in `load()`, so post-update banner disappears after flag is cleared
- [x] 3.3 Change Settings button color: default `textMuted`, on hover – `accent`; if plugin or CLI update available – permanent `accent`

## 4. Banner UI in sidebar

- [x] 4.1 Create `UpdateBanner` component – text in `textMuted` about available updates, Settings (`accent`) and Dismiss (`warn`) buttons, divider below
- [x] 4.2 Integrate banner above action row (Explore/Propose), below header row; show on `pluginUpdate || cliUpdate` and not dismissed
- [x] 4.3 Implement dismiss: hide banner until next data reload or Check Versions
- [x] 4.4 Post-update banner above action buttons: on `updateFlag && flag.new === VERSION` – "Run checks after update" + Complete Update button (`accent`); on `flag.new !== VERSION` – soft hint "reopen opencode to finish update"

## 5. Versions section in Settings screen

- [x] 5.1 Add versions section to `settings.tsx`: "Plugin version" and "OpenSpec CLI" lines with current values (CLI → "unknown" if not determined)
- [x] 5.2 When an update is available for a component: text "x.y.z version available" + Update button on the right of the same line, `success` color (separate for plugin and CLI)
- [x] 5.3 Check Versions button – calls `runVersionCheck(true)` (plugin fetch, no agent), updates signals; toast with result: `success` "All versions are up to date", or `warning` "Couldn't reach npm registry"; available updates aren't toasted – they're already in the UI
- [x] 5.4 Update All button (`success` color) – above divider, on the right; shown when at least one update is available; calls `buildUpdatePrompt` only with outdated components
- [x] 5.5 Update / Update All → `sendPrompt(api, buildUpdatePrompt(targets), { clear: true, submit: true })`; blocked on `busy()` (toast "Wait until the agent finishes working")
- [x] 5.6 After agent turn completes (`pendingReload`): show "Reload opencode to update plugin" + Reload button (`error`) → `quitOpencode`

## 6. Migrations after reload

- [x] 6.1 Complete Update: reads `updateFlag`, calls `buildMigrationPrompt({ old, new })`, sends directly to agent via `sendPrompt`
- [x] 6.2 Complete Update blocked on `busy()` – prompt not sent, toast "Wait until the agent finishes working"
- [x] 6.3 After flag cleared by agent: next poll sees empty `plugin.update-in-progress` → `updateFlag` = null, banner hidden

## 7. Testing and verification

- [x] 7.1 Verify that `fetch` works in plugin host runtime – confirmed live (debug line returned versions from npm) and with smoke test; agent fallback wasn't needed yet
- [x] 7.2 Run typecheck – no type errors
- [x] 7.3 Build plugin (`bun run build`) – build passes, existing tests (23) green
- [x] 7.4 Banner display / separate Update/Update All confirmed visually (preview via temporary hardcoded values). Remaining: test live button blocking on `busy()`, full round-trip Update → reload → Complete Update on a real update
