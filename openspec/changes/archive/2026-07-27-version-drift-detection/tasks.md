## 1. Remembering version between launches

- [x] 1.1 Create `src/lib/version-history.ts`: key `openspec.lastVersion`, `readLastVersion(api)` dropping non-string values, `recordVersion(api)` – writes `VERSION` from the build
- [x] 1.2 Add `pendingVersionRange(last, current = VERSION)`: returns `{ old, new }` only if `last` is a valid string and `current` is strictly higher; otherwise `null` (first launch, match, rollback). Current version as parameter – otherwise untestable: in dev build `VERSION` equals `"dev"`
- [x] 1.3 Tests `test/version-history.test.ts` on a stub `kv`: no entry → `null` and version recorded; version lower → range; match → `null`; version higher (rollback) → `null`; dev build produces nothing

## 2. Migration prompt without flag

- [x] 2.1 In `src/lib/migrations.ts`, add `hasMigrations(old, next)` on top of `collectMigrations` – needed so the banner doesn't show on a release without entries
- [x] 2.2 Replace signature with `buildMigrationPrompt(range, opts?: { clearFlag?: boolean })`: flag removal line for `plugin.update-in-progress` is added only when `clearFlag`
- [x] 2.3 Tests `test/migrations.test.ts`: range `(old, new]` and entry order; flag removal line present with `clearFlag: true` and absent by default

## 3. Sidebar folds two sources

- [x] 3.1 In `src/sidebar.tsx`, create a signal for last version from `kv`, read once on startup
- [x] 3.2 Add memo for pending range: flag `update-in-progress` takes priority; otherwise range from `kv`, but only when `hasMigrations` is true for it
- [x] 3.3 Silently record version in `kv` when there's nothing to show (no entry, match, rollback, empty range)
- [x] 3.4 Switch post-update banner to pending range instead of `updateFlag` directly; keep the "Reopen opencode to finish updating to X" branch only for the flag – `kv` doesn't produce such a state
- [x] 3.5 Complete Update passes `clearFlag` depending on the source of the range
- [x] 3.6 On migration turn completion (busy→idle, alongside `pendingReload`), write `VERSION` to `kv`

## 4. Decision as a pure function, not inside a component

Decision logic sat in sidebar signals, so it could only be tested with a live TUI. You also can't manually write a value into `kv` for a test stand: it doesn't live as a separate file or a table in any of the `opencode*.db`.

- [x] 4.1 Move decision to `decideMigration({ flag, last, current, hasEntries })` → `{ show: "migrate", range, fromFlag } | { show: "reopen", range } | { show: "none", record }`
- [x] 4.2 Pass `hasEntries` as a parameter rather than importing `hasMigrations` inside – otherwise the test depends on `MIGRATIONS` content that changes every release
- [x] 4.3 Sidebar: memo over `decideMigration`, separate memos for two banner branches instead of nested `Show`; `syncVersionHistory` and Complete Update read the same decision
- [x] 4.4 Table test on entire matrix: two sources × (first launch / match / growth / rollback / range without entries), plus "nothing recorded during update"

## 5. Verification and documentation

- [x] 5.1 Run `bun run typecheck`, `bun run test`, `bun run build`
- [x] 5.2 Add entry to `MIGRATIONS` about the release
- [x] 5.3 Update `AGENTS.md`: `kv` as source of "last launched version", and that `MIGRATIONS` entries now reach everyone, not just button pressers
- [x] 5.4 Verify that `kv` survives restart – the only thing a test can't close. **Confirmed 2026-07-26** with debug log: two consecutive launches, second read version written by first. Lives in `~/.local/state/opencode/kv.json`, globally, plain JSON
- [x] 5.5 Smoke on first real release (0.3.0): update, verify banner appeared, Complete Update ran and banner doesn't reappear. Can't test in dev checkout – there `VERSION` equals `"dev"` and the `kv` branch is inactive by construction
- [x] 5.6 Also check path through Update button: flag in config.yaml → Complete Update → agent removed flag
