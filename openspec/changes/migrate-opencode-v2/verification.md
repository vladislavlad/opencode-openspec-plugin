# Verification

Date: 2026-10-22. Branch: main. V2 remains uncommitted and unpublished.

## V1 checkpoint and delivery

- V1 source and strengthened CI/release checks are committed as `12471cc`, with annotated local tag `v1.0.0`.
- No push, npm publish or GitHub release was performed. A local tag does not trigger GitHub Actions.
- CI runs lint, typecheck, build, tests and strict validation of active changes. Release additionally verifies that the tag equals `v${package.version}` and inspects the package before publishing.
- Previous three public release runs were successful; the latest inspected run was https://github.com/vladislavlad/opencode-openspec-plugin/actions/runs/30564453684 . Existing trusted-publisher workflow identity was preserved. Private npm publisher settings were not inspected.
- V1 installation, usage, compatibility and pinned version are retained in `docs/v1.md`, linked from README and included in the npm package. V1's updater does not filter npm latest by host major; the guide explicitly keeps V1 pinned to 1.0.0.

## Automated checks

- `bun install --frozen-lockfile`: passed, no lockfile changes.
- `bun run lint`: passed.
- `bun run typecheck`: passed against @opencode/plugin/theme 2.1.3, OpenTUI 0.6.6, Solid 1.9.15.
- `bun run build`: passed; build constant is 2.0.0 and host runtime imports remain external.
- `bun run test`: 298 passed, 0 failed, 813 assertions across 23 files. Includes native command arguments, dialog cancellation, pending duplicate rejection, route/running transitions, home session creation, failed sends, native exit, scoped location reads, trailing directory separators, slot disposal, native catalog reload/retry, theme tokens, storage failure and existing rendering/parsing coverage.
- OpenSpec 1.14.3 `validate --changes --strict`: all three active changes passed. Main `openspec/specs/` was not edited.
- `npm pack --dry-run --json --cache /private/tmp/openspec-plugin-v2-npm-cache`: passed for 2.0.0. Contents: LICENSE, README.md, dist/index.js, docs/v1.md, package.json, tui.js. The temporary cache avoids this machine's unwritable default npm cache; no ownership changes were made.
- `git diff --check`: passed.

## Real OpenCode V2 host

Installed @opencode/cli 2.1.3 in `/private/tmp/openspec-plugin-v2-host`, with separate XDG/config/data/state/cache paths and an explicit loopback server on port 41973. The existing global installation was untouched. The server and test TUI were stopped after verification.

Observed in the actual 160×55 TUI:

- Native plugin setup and sidebar.content slot load successfully from the local package directory.
- Fixture project renders one active change with 0/1 tasks and one specification with one requirement.
- Explore opens the native editable dialog with `/opsx-explore`; Escape cancels it while `SMOKE_DRAFT_KEEP` remains in the main composer.
- The palette shows exactly the plugin's Configure and Baseline commands after reload. Typing `/opsx-config ONLY_V2_SMOKE` retains its argument in the composer instead of executing on selection.
- Durable storage contains `{"last":"2.0.0"}` in the host-owned plugin store.
- Hot rebuilding reloads the contribution; no duplicate commands were observed.
- Session API reports zero tokens and zero cost. No prompt was submitted to a real model. Sending and errors are covered by controlled transport tests; model execution, permissions and external provider behavior are not claimed as live acceptance.

The host smoke caught two loading details that are now reflected in code, tests and docs: CLI config is a single global `cli.json` (with config-directory/XDG and inline environment overrides), and local TUI directories need a physical `tui.js` entrypoint. Published packages resolve `./tui`. V2 file-list directory paths include a trailing slash; the sidebar strips it before extracting names.

Temporary text frames: `/private/tmp/openspec-plugin-v2-host/dialog-frame.txt`, `/private/tmp/openspec-plugin-v2-host/palette-frame.txt`.

## Review follow-up: pending submissions

- Added render regressions for repeated Update/Update All clicks, repeated Complete Update, and retry after a failed submission. Before the fix, the first two failed: reload guidance disappeared and migration history stayed at the old version.
- Setup and update actions now reserve the sidebar gate before asynchronous work. Duplicate/competing clicks cannot clear the accepted operation's flags; submission failure unlocks retry without simulating agent completion.
- `bun run test`: 301 passed, 0 failed, 826 assertions across 23 files. Lint, typecheck, build, strict validation of all three active changes and `git diff --check` passed.
- No real model execution was added. This follow-up fixed pending-action ownership; agent/model policy and the remaining V1 requirement conflicts were addressed in the next follow-up below. V2 remains uncommitted and unpublished.

## Review follow-up: explicit execution settings

- Explore now selects Plan; all other plugin agent turns select Build. Existing sessions await agent selection and then the captured user-selected model/variant before sending. Home session creation receives both explicitly. There is no automatic agent restore.
- Native command dialogs show agent, provider/model and variant. Cancellation leaves session settings unchanged; editing across the Plan/Build boundary shows the updated preview before submission. Missing model selection, preparation errors and route/location/running changes stop dispatch and show feedback.
- Tests cover the shared transport and own slash commands, model snapshots surviving host selection changes, home/default variant, changed-agent previews, preparation failures, races, duplicate pending actions and retry.
- `bun run test`: 325 passed, 0 failed, 924 assertions across 23 files. Lint, typecheck, build, strict validation of all three active changes and `git diff --check` passed.
- Reconstructed all seven effective specs with OpenSpec 1.14.3 `findSpecUpdates` / `buildUpdatedSpec` without writing main specs. Every result passed `validateSpecContent` with no merge warnings. The effective init spec has neither temporary-command requirement nor pending ephemeral setup; update-flow has no kv contract; prompt-sending has no default-agent or preserved-agent policy. Previews are in `/tmp/openspec-v2-effective-specs/`.
- Updated README, AGENTS and the existing 2.0.0 MIGRATIONS entry. Main specs and the V1 guide remain unchanged. No new live model turn was executed; the new selection/dispatch behavior is verified with controlled API tests. Nothing was committed or published.

## Review follow-up: native command execution overrides

- Plugin actions resolve configured command text before changing session settings and send it through `session.prompt`. They no longer invoke `session.command`, whose V2 executor can override the selected agent/model or create a subagent. Document and markdown execution metadata is ignored; the configured template, source precedence and argument expansion are retained.
- Added regressions for conflicting agent/model/subagent/subtask settings in both JSON and markdown, for Explore/Apply from existing sessions and home. Restoring native command dispatch in an isolated temporary source copy makes all eight policy cases fail; the fixed implementation passes them. Additional tests cover source precedence, project/global server reads, frontmatter, quoted and multiline arguments, missing/empty/unreadable templates, shell interpolation, duplicate requests, model snapshots and route/location/running changes during reads.
- Shell interpolation is deliberately rejected before session mutation, with guidance to replace it with agent instructions. There is no native fallback, shell execution, temporary command registration or configuration rewrite. Commands typed directly in the host composer retain native behavior. README, AGENTS, design/deltas and the existing 2.0.0 MIGRATIONS entry describe this boundary.
- `bun run test`: **354 passed, 0 failed, 1023 assertions across 24 files**. `bun run lint`, `bun run typecheck`, `bun run build`, `openspec validate --changes --strict` (all three active changes) and `git diff --check` passed. Full test log: `/tmp/p2-native-override-tests.log`; regression failure check: `/tmp/p2-native-regression-red.log`.
- Reconstructed all seven effective specs without writing main specs: zero merge warnings, errors or newly introduced validation warnings. Strict content validation also reports three inherited long-requirement warnings already present in main specs: init-flow `Final Init Section Removes Marker Without Extra Validation`, sidebar-ui `Specifications Section`, update-flow `Update Completion Prompt`. These unchanged base requirements are outside this fix; previews are in `/tmp/p2-effective-specs/`.
- Actual isolated OpenCode **2.1.3** server smoke on loopback confirmed project/global template resolution, native missing-file errors/fallback, metadata stripping and argument expansion through the real config/file APIs. Only read APIs were called; no model turn was submitted. Temporary command files were removed and the isolated server was stopped. Agent/model execution policy is covered by controlled transport regression tests.
- Version remains **2.0.0**, HEAD remains `12471cc`, and local `v1.0.0` is unchanged. Main specs and the V1 guide were not edited. No commit, push, archive, sync or publication was performed.

## Review follow-up: symlinks and frontmatter

- Project command reads now use the captured project location and a project-relative path, allowing file and directory symlinks to templates elsewhere inside that project. External/global configuration files retain their source-directory scope. Server path semantics are selected explicitly for POSIX/Windows, independently of the TUI OS; scopes are never widened to the filesystem root. Links outside those server read scopes remain subject to the server's filesystem boundary.
- Replaced regex-only header removal with bundled `gray-matter@4.0.3`, including OpenCode's unquoted-colon retry. Validate command fields before selecting a definition; malformed YAML and invalid fields fall through to the next valid native source instead of sending their body. Schema-parity tests compare accepted fields against the installed `ConfigCommand.Info`. JavaScript frontmatter engines are disabled to prevent evaluation in the TUI. Valid execution metadata is still ignored: Explore remains Plan, other actions Build, with the captured model/variant.
- Added 43 tests for real filesystem symlinks with native-style realpath confinement, project/global and singular/plural precedence, malformed YAML/invalid fields, no-valid-definition failure and retry, parser cache behavior, native field-schema parity, data-only parsing, and POSIX/Windows source paths. Restoring the former loader in a temporary source copy makes all **15 targeted regression cases fail**; they pass with the fixed loader. Log: `/tmp/p2-source-regression-red.log`.
- Repeated both review reproductions on actual isolated OpenCode **2.1.3** servers: native catalog and plugin text agree on `PROJECT SYMLINK` / `PROJECT action example`, and malformed project YAML selects `GLOBAL FALLBACK` / `GLOBAL action example`. Scripts: `/tmp/fixed-command-symlink.ts`, `/tmp/fixed-command-invalid.ts`. Only config/file/catalog reads ran; no model turn. Both servers stopped and their fixtures were removed.
- Full suite: **397 passed, 0 failed, 1142 assertions across 25 files** (`/tmp/p2-source-full-tests.log`). Lint, typecheck, build, frozen install, npm package dry-run, all three active changes' strict validation, and diff whitespace checks passed. Reconstructed seven effective specs: zero errors, merge warnings or new validation warnings; the three inherited long-requirement warnings listed above remain unchanged.
- Updated the current change's proposal/design/deltas/tasks, README, AGENTS and 2.0.0 release notes. Version remains **2.0.0**; HEAD/local V1 tag remain `12471cc`. No main-spec edits, sync/archive, commits, push or publication.

## Theme regression (2026-10-25)

- Corrected the shared theme adapter: primary/secondary controls use `hue.interactive[200]`, accents use `hue.accent[200]`. Native action foreground tokens can be neutral in colored themes and are unsuitable for the plugin's text buttons. Feedback and disabled colors retain their semantic tokens; no color is hardcoded.
- Added four regressions using the installed OpenCode theme migration/resolver for dark, light and monochrome themes, plus rendered Init/shared buttons, live theme switching, hover foreground/background and busy click protection. All four fail with the former adapter (`/tmp/openspec-theme-red.log`) and pass after the fix.
- Full suite: **401 passed, 0 failed, 1174 assertions across 26 files** (`/tmp/openspec-theme-full.log`). Lint, typecheck, build and strict change validation passed. Rebuilt `dist/index.js` for local directory loading through `tui.js`. No model request, commit or publication.

## UI review and derivation resources (2026-10-25)

- Reviewed source and controlled render coverage for overview, setup/resume, settings/update states, changes/tasks/deletion, specs/areas/requirements and search. Removed the overview's two persistent helper lines that duplicate execution-dialog guidance. Settings no longer duplicates a single component's Update with Update All; the combined action remains for two updates. Existing conditional setup/error/progress messages are retained. No additional comparable persistent prose duplication was found in those views; this is code/render verification, not live acceptance in the user's session.
- The shared derivation prompt prohibits delegation before its stage-4 question. Choices are parent only, one child, or up to two concurrent children (recommended); an explicit positive integer sets a custom maximum. This applies to Init, unfinished Resume and Baseline, independently of depth. Missing/cancelled/invalid choices or unusable delegation tooling fall back to sequential parent work. Background children occupy slots until completion, batches are awaited fully, nesting is forbidden and areas remain sequential. A limit of two for five tasks means 2 + 2 + 1. Verification and boundary/language rules apply to both parent and delegated work.
- The pinned 2.1.3 TUI context/config schema exposes no concurrency scheduler setting; `experimental.subagent_depth` controls nesting rather than simultaneous children. This change is prompt-level scheduling, not a host-enforced or machine-wide limit. No additional plugin was installed and no host/user configuration was changed. Existing live child sessions are unaffected until a new prompt run.
- Added ten prompt/settings cases and overview assertions; retained the competing-update regression with a fixture containing two actual updates. Full suite: **411 passed, 0 failed, 1235 assertions across 26 files** (`/tmp/openspec-ui-resources-full.log`). Lint, typecheck, production build, all three active changes' strict validation and diff whitespace checks passed. `dist/index.js` is rebuilt with version **2.0.0**.
- The tests verify prompt instructions, shared caller coverage, conditional rendering and existing behavior; they do not prove that an LLM obeys the scheduling policy in a live run. No paid model turns, commits, tags, sync/archive, push or publication were performed. Main specs were not edited.

## Sources

- https://opencode.ai/v2/docs/build/plugins/cli/
- https://opencode.ai/v2/docs/build/plugins/migrate-v1/
- OpenCode v2.1.3 tagged `packages/cli/src/config/config.ts`, `packages/tui/src/plugin/context.tsx`, `services/www/src/docs/content/cli/config.mdx` and the published SDK/client/host resolver.
- https://github.com/anomalyco/opencode/blob/v2.1.3/packages/core/src/config/plugin/command.ts — native execution metadata precedence, source order and argument expansion.
- https://github.com/anomalyco/opencode/blob/v2.1.3/packages/core/src/filesystem.ts — location-scoped file reads and missing-file behavior.
