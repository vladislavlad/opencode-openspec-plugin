## MODIFIED Requirements


### Requirement: Remembering Last Launched Plugin Version
The plugin SHALL persist the last launched version in V2 storage.store("version-history") under last. Writes SHALL be awaited and failures SHALL not falsely advance local history. Existing config update flags retain priority; an absent V2 record SHALL NOT invent a V1 source version.

#### Scenario: Reading Saved Version
- **WHEN** the durable store contains a nonempty version string
- **THEN** it is returned

#### Scenario: No Entry Yet
- **WHEN** the V2 store has no last version
- **THEN** history is null and no previous version is fabricated

#### Scenario: Value Is Corrupted
- **WHEN** last is not a nonempty string
- **THEN** it is treated as absent

#### Scenario: Fixing Current Version
- **WHEN** a version write succeeds
- **THEN** last becomes the build constant

#### Scenario: Storage Write Failed
- **WHEN** persistence rejects
- **THEN** the failure is handled and the UI does not claim the version was recorded

## REMOVED Requirements

### Requirement: Post-update Banner In Sidebar
**Reason**: The V1 banner's kv scenarios no longer describe the V2 durable storage contract.
**Migration**: Use V2 Post-update Banner In Sidebar, preserving flag priority and completion behavior while awaiting durable version-history writes.

### Requirement: Update Prompt
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use V2 Update Prompt in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: V2 Post-update Banner In Sidebar
Sidebar SHALL show "Run checks after update" banner above action row when there's a pending migration range. Range comes from two sources: flag `plugin.update-in-progress` in config.yaml and version growth saved in V2 `version-history.last` storage. Flag takes priority — it alone knows exact version departed from.

#### Scenario: Show Banner After Reload
- **WHEN** plugin loads, `updateFlag` contains `{ old, new }` and `flag.new === VERSION`
- **THEN** banner with text about need to complete update and Complete Update button (`accent`) displays

#### Scenario: New Version Didn't Pick Up
- **WHEN** `updateFlag` contains `{ old, new }`, but `flag.new !== VERSION`
- **THEN** message "Reopen opencode to finish updating..." shows with Reopen OpenCode button (`error`), which closes opencode; migrations don't run

#### Scenario: Update Passed Bypassing Update Button
- **WHEN** no flag in config.yaml, saved version in V2 `version-history.last` storage is below loaded one, and for range there's at least one `MIGRATIONS` entry
- **THEN** same banner displays with Complete Update button for range from saved version to loaded one

#### Scenario: Nothing To Show In Range
- **WHEN** saved version is below loaded one, but no `MIGRATIONS` entries in range
- **THEN** banner doesn't show, and version is recorded in V2 `version-history.last` storage only after a successful write

#### Scenario: Nothing To Show From Start
- **WHEN** saved version doesn't exist, or matches loaded one, or is above it
- **THEN** banner doesn't show, and version is recorded in V2 `version-history.last` storage only after a successful write

#### Scenario: Both Sources Indicate Update
- **WHEN** both flag `plugin.update-in-progress` and version drift in V2 `version-history.last` storage exist
- **THEN** range from flag is used, banner shows once

#### Scenario: Pressing Complete Update
- **WHEN** user presses Complete Update while agent idle
- **THEN** plugin forms prompt from migration instructions for pending range and sends to agent directly; buttons lock until agent turn completes

#### Scenario: Prompt For Range From Storage Doesn't Clear Flag
- **WHEN** pending range obtained from V2 `version-history.last` storage, not from flag
- **THEN** prompt doesn't contain requirement to delete `plugin.update-in-progress` from config.yaml — nothing to clear

#### Scenario: Complete Update Locked During Agent Work
- **WHEN** agent is busy and user presses Complete Update
- **THEN** prompt isn't sent, toast "Wait until the agent finishes working" shows

#### Scenario: Successful Migration Completion
- **WHEN** agent completed turn after Complete Update
- **THEN** sidebar awaits recording `VERSION` in V2 `version-history.last` storage, and the banner from this source disappears only after a successful write

#### Scenario: Flag Cleared By Agent
- **WHEN** agent completed turn after Complete Update and cleared `plugin.update-in-progress` from config.yaml
- **THEN** `updateFlag` becomes `null`, banner hides


### Requirement: Pending Submission Ownership
Update and Complete Update SHALL reserve the sidebar action gate before asynchronous preparation or submission begins. A repeated or competing action SHALL leave the accepted operation's completion flags intact. Submission failure SHALL release the gate and clear only that operation's flags so the user can retry. Request submission SHALL NOT be treated as an agent busy-to-idle completion.

#### Scenario: Repeated Update Before Running
- **WHEN** Update is pressed again while its first request is pending and the session is still idle
- **THEN** only one request is sent, wait feedback is shown, and Reload OpenCode appears after that accepted turn transitions from running to idle

#### Scenario: Repeated Migration Completion
- **WHEN** Complete Update is pressed again while its first request is pending
- **THEN** only one migration request is sent and its completion still records the running plugin version

#### Scenario: Failed Submission Can Be Retried
- **WHEN** an update request fails before the agent starts
- **THEN** no reload or version-completion effect runs and the user can submit the action again

### Requirement: V2 Update Prompt
System SHALL form update prompt only for components that are actually outdated, and SHALL describe plugin update as editing specifier in `cli.json`, and CLI update — as global install followed by `openspec update --force`. Prompt SHALL require touching nothing except listed steps.

#### Scenario: Finding cli.json
- **WHEN** prompt updates plugin
- **THEN** it instructs to find the global `cli.json`, honoring OPENCODE_CONFIG_DIR and XDG_CONFIG_HOME, and stop if OPENCODE_CLI_CONFIG_CONTENT overrides the plugin entry

#### Scenario: Plugin Array Entry Can Be String Or Object
- **WHEN** prompt describes editing entry
- **THEN** it covers both entry forms — string and object `{ package: specifier, options: { …options } }` — and instructs to edit only the specifier or package field, preserving options

#### Scenario: Dev Checkout Not Updated
- **WHEN** entry in `cli.json` points to local file system path
- **THEN** prompt instructs to skip plugin update and inform user about it

#### Scenario: Update Flag Written Along With Edit
- **WHEN** prompt updates plugin
- **THEN** it instructs to write block `plugin.update-in-progress` with fields `old` and `new` into `openspec/config.yaml`, preserving `schema`, `context` and `rules`, and create file with `schema: spec-driven` if it doesn't exist yet

#### Scenario: CLI Update Only
- **WHEN** only CLI is outdated
- **THEN** prompt contains no steps about `cli.json` and doesn't write flag — plugin migrations don't run

#### Scenario: Prompt Completion
- **WHEN** prompt is assembled for any set of components
- **THEN** it ends with instruction to ask user to restart opencode

## MODIFIED Requirements

### Requirement: Versions Section In Settings
Sidebar SHALL show in Settings screen a versions section with current plugin and openspec CLI versions, available updates and control buttons.

#### Scenario: Displaying Plugin Version
- **WHEN** Settings screen is open
- **THEN** line "Plugin version" on left and current version value (e.g., `0.2.0`) on right display on same line

#### Scenario: Plugin Update Available
- **WHEN** `pluginUpdate` is not `null`
- **THEN** below version line text "x.y.z version available" and Update button in next line display

#### Scenario: Displaying openspec CLI Version
- **WHEN** Settings screen is open
- **THEN** line "OpenSpec CLI" on left and current version value (`generatedBy`) on right display; if version not determined — "unknown"

#### Scenario: CLI Update Available
- **WHEN** `cliUpdate` is not `null`
- **THEN** below version line text "x.y.z version available" and Update button in next line display

#### Scenario: Check Versions Button
- **WHEN** Settings screen is open
- **THEN** at bottom of versions section Check Versions button displays, which calls plugin function `checkVersions` (without agent turn) to restart update check

#### Scenario: Pressing Update For Component
- **WHEN** user presses Update next to plugin or CLI line while agent idle
- **THEN** plugin sends `buildUpdatePrompt` with this component via `submitPrompt`, buttons lock until agent turn completes; after update message "Reload opencode to update plugin" and Reload button (`error`) display, closing opencode

#### Scenario: Update Locked During Agent Work
- **WHEN** agent is busy and user presses Update or Update All
- **THEN** prompt isn't sent, toast "Wait until the agent finishes working" shows

#### Scenario: Update All Button
- **WHEN** both plugin and CLI updates are available
- **THEN** at bottom of versions section Update All button displays, which sends `buildUpdatePrompt` only with actually outdated components

#### Scenario: Updates Unavailable — Update All Hidden
- **WHEN** updates unavailable or check hasn't executed yet
- **THEN** Update All button doesn't display, only Check Versions visible

#### Scenario: Single Available Update
- **WHEN** only one component has an update
- **THEN** its own Update button remains available and the equivalent Update All button is hidden
