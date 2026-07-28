## ADDED Requirements

### Requirement: Plugin update check via npm registry
The plugin SHALL asynchronously check for a new version of `@vladislavlad/opencode-openspec-plugin` in the npm registry on sidebar load and on user request, without blocking render.

#### Scenario: Successful check
- **WHEN** sidebar loads or the user clicks Check Versions
- **THEN** HTTP GET to `registry.npmjs.org/@vladislavlad%2Fopencode-openspec-plugin/latest` returns the latest version, which is compared with current (`__PLUGIN_VERSION__`)

#### Scenario: Plugin update available
- **WHEN** the npm latest version is greater than the current plugin version
- **THEN** `pluginUpdate` state contains `{ current, next }`, banner is shown

#### Scenario: No update
- **WHEN** the latest version matches or is less than current
- **THEN** `pluginUpdate` state equals `null`, banner is not shown

#### Scenario: npm registry request error
- **WHEN** HTTP request fails with an error or timeout (3s)
- **THEN** error is silently ignored, `pluginUpdate` equals `null`, banner is not shown, render is not delayed

### Requirement: CLI version detection and update check
The plugin SHALL determine the current openspec CLI version from the `generatedBy` stamp and check for updates via npm registry.

#### Scenario: Determine current CLI version
- **WHEN** at least one `.opencode/skills/*/SKILL.md` exists
- **THEN** the plugin extracts `metadata.generatedBy` as the current CLI version

#### Scenario: CLI version not determined
- **WHEN** no `SKILL.md` is found or it has no `generatedBy`
- **THEN** the plugin sets CLI version to "unknown", CLI update check is skipped

#### Scenario: Check CLI version via npm registry
- **WHEN** current CLI version is determined and HTTP GET to `registry.npmjs.org/@fission-ai%2Fopenspec/latest` succeeds
- **THEN** the plugin extracts the latest openspec CLI version and compares with `generatedBy`

#### Scenario: CLI update available
- **WHEN** the latest openspec version is greater than current
- **THEN** `cliUpdate` state contains `{ current, next }`, banner is shown

#### Scenario: CLI check error
- **WHEN** registry request fails or version is not determined
- **THEN** error is silently ignored, `cliUpdate` equals `null`

### Requirement: Version check from panel
The plugin SHALL provide a plugin function for checking versions, called on sidebar load and by the Check Versions button, without an agent turn. Manual check SHALL report result via toast.

#### Scenario: Auto-check on load
- **WHEN** sidebar loads and project directory is determined
- **THEN** plugin calls `checkVersions` asynchronously (fire-and-forget), result goes into sidebar signals; no toast shown

#### Scenario: Manual check
- **WHEN** the user clicks Check Versions in Settings
- **THEN** plugin re-calls `checkVersions` (regular fetch, no agent) and updates signals; dismissed banner may appear again

#### Scenario: Manual check – all current
- **WHEN** manual check completes successfully (`reachable`) with no updates
- **THEN** a `success` toast "All versions are up to date" is shown

#### Scenario: Manual check – update available
- **WHEN** manual check finds a plugin or CLI update
- **THEN** no toast is shown – the update is highlighted in the banner and Settings lines

#### Scenario: Manual check – registry unavailable
- **WHEN** manual check cannot reach registry (both requests returned `null`, `reachable` = false)
- **THEN** a `warning` toast "Couldn't reach npm registry" is shown; no false "up to date" message

### Requirement: Plugin and CLI update via direct prompt
The panel SHALL trigger updates by sending a direct prompt to the agent through `sendPrompt`, without registering palette commands, separately for plugin and CLI.

#### Scenario: Update plugin
- **WHEN** the user clicks Update on the plugin line while agent is idle
- **THEN** plugin sends `buildUpdatePrompt({ plugin })`; agent edits the specifier in `tui.json` to `@vladislavlad/opencode-openspec-plugin@<next>`, writes `plugin.update-in-progress: { old, new }` to config.yaml and reports that opencode restart is needed

#### Scenario: Update CLI
- **WHEN** the user clicks Update on the CLI line while agent is idle
- **THEN** plugin sends `buildUpdatePrompt({ cli })`; agent runs `npm i -g @fission-ai/openspec@<next>` through the determined package manager and `openspec update --force`, then reports that opencode restart is needed

#### Scenario: Update All
- **WHEN** the user clicks Update All while agent is idle
- **THEN** plugin sends `buildUpdatePrompt` only with actually outdated components; plugin and CLI blocks are combined, reload requested once

#### Scenario: Dev entry in tui.json
- **WHEN** the plugin entry in `tui.json` is a local path (dev mode), not an npm name
- **THEN** the PLUGIN block of the prompt is skipped – nothing to update

#### Scenario: Update blocked while agent is working
- **WHEN** agent is busy and user clicks Update or Update All
- **THEN** prompt is not sent, toast "Wait until the agent finishes working" is shown

### Requirement: update-in-progress flag in config.yaml
The plugin SHALL read the `plugin.update-in-progress` flag from config.yaml on load and display a post-update banner.

#### Scenario: Flag detected on load
- **WHEN** plugin loads and config.yaml contains `plugin.update-in-progress` with `old`/`new` fields
- **THEN** `updateFlag` state contains `{ old, new }`

#### Scenario: Flag absent
- **WHEN** config.yaml does not contain `plugin.update-in-progress`
- **THEN** `updateFlag` equals `null`, post-update banner is not shown, plugin operates normally

#### Scenario: Flag written only on plugin update
- **WHEN** a CLI-only update runs
- **THEN** `plugin.update-in-progress` is not written – after reload the post-update banner is not shown

### Requirement: Migrations after update
The panel SHALL provide a Complete Update button that forms a prompt from migration instructions and release notes and sends it directly to the agent. Each migration is described as `Migration { instructions, releaseNotes }`.

#### Scenario: Click Complete Update
- **WHEN** the user clicks Complete Update while agent is idle
- **THEN** plugin reads `updateFlag`, calls `buildMigrationPrompt({ old, new })` (migrations from `migrations.ts` for range `(old, new]`) and sends prompt to agent via `sendPrompt`

#### Scenario: Agent reports what's new
- **WHEN** migrations in the range have `releaseNotes` filled
- **THEN** prompt asks agent to tell user which features appeared in these versions (by version), in addition to executing `instructions`

#### Scenario: Complete Update blocked while agent is working
- **WHEN** agent is busy and user clicks Complete Update
- **THEN** prompt is not sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Migration completed successfully
- **WHEN** agent completes turn after Complete Update and clears `plugin.update-in-progress` from config.yaml
- **THEN** next poll sees empty flag, `updateFlag` becomes `null`, banner hidden

#### Scenario: No migration instructions found
- **WHEN** no instructions exist in `migrations.ts` for the version range
- **THEN** agent receives a minimal prompt with version check and clearing of `plugin.update-in-progress` flag
