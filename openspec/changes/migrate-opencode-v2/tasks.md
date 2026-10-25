# Tasks

## 1. V2 host integration

- [x] 1.1 Pin V2 SDK/theme and renderer, export the native plugin and sidebar slot with cleanup, and adapt scoped files and theme tokens; verify typecheck and lifecycle/location/render tests.
- [x] 1.2 Replace kv with durable V2 storage and guard asynchronous writes; verify version detection, update flag priority and storage failure handling.

## 2. Commands and user actions

- [x] 2.1 Register native argument-aware V2 commands and running guards, replace prompt insertion with editable dialogs and explicit session submission, and defer native exit; verify arguments, cancellation, duplicate sends, route/busy races, errors and home behavior.
- [x] 2.2 Reload native commands after setup, preserve guarded deletion and navigation, and update the sidebar action guidance; verify setup reload, busy guards and render interactions.

## 3. Installation and release

- [x] 3.1 Set version 2.0.0, add MIGRATIONS notes and update cli.json installation/update prompts and README/AGENTS; verify prompt tests, version consistency and package exports.
- [x] 3.2 Run frozen install, full tests, lint, typecheck, build, strict active-change validation and npm pack dry-run; smoke-test an isolated OpenCode 2.1.3 host and record evidence without committing or publishing V2.

## 4. Review follow-up: pending actions

- [x] 4.1 Preserve setup/update completion state under repeated or competing clicks before running; add render regressions for Update, Complete Update and failed-submission retry, update the 2.0.0 MIGRATIONS notes, and run tests, lint, typecheck, build and strict OpenSpec validation.

## 5. Review follow-up: execution policy and specification consistency

- [x] 5.1 Run Explore in Plan and every other plugin agent action in Build with the user-selected model/variant; show execution settings in dialogs, preserve cancellation and race guards, and cover home, existing sessions and preparation failures with tests. Update the 2.0.0 MIGRATIONS entry and usage documentation.
- [x] 5.2 Reconcile init reload and durable version-history deltas, removing the remaining V1 requirement conflicts; verify the effective requirements without editing main specs and run full tests, lint, typecheck, build and strict OpenSpec validation.

## 6. Review follow-up: native command overrides

- [x] 6.1 Resolve configured OpenSpec templates with arguments before session preparation and submit them directly, ignoring native execution metadata. Cover conflicting agent/model/subagent settings, configuration precedence, unsupported templates and asynchronous guards with regressions; update the 2.0.0 MIGRATIONS entry and usage documentation, then run full tests, lint, typecheck, build and strict OpenSpec validation.

## 7. Review follow-up: command source parity

- [x] 7.1 Read project command symlinks within the captured project scope and validate markdown frontmatter before source selection using OpenCode-compatible parsing. Add regressions for project links versus global fallback, invalid YAML/metadata and preserved Plan/Build/model selection; verify against the actual V2 server, update 2.0.0 release notes/docs, and run tests, lint, typecheck, build and strict OpenSpec validation.

## 8. Theme regression

- [x] 8.1 Restore themed colors for active buttons and accents using V2 hue palettes instead of neutral action text. Preserve muted disabled states and live theme changes; add native-theme and button-render regressions, update the 2.0.0 release notes and run tests, lint, typecheck, build and strict OpenSpec validation.

## 9. UI review and derivation resources

- [x] 9.1 Remove persistent action help duplicated by the command dialog and show Update All only for two outdated components. Review sidebar, setup, settings, changes, specs and search views; add render regressions for clean action rows and settings states.
- [x] 9.2 Ask once before Scan whether to use no subagents, one at a time or up to two at once; support an explicitly entered positive limit. Apply the chosen limit through Scan and Detail with bounded batches, no nested delegation and a sequential fallback. Preserve area boundaries, verification and reporting in Init, Resume and Baseline; update deltas, design, README and 2.0.0 release notes.
- [x] 9.3 Run prompt/render regressions, full tests, lint, typecheck, build and strict OpenSpec validation; record verified scope and the distinction between prompt scheduling and a host-enforced concurrency limit.
