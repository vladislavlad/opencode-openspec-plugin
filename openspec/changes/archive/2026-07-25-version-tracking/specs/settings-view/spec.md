## MODIFIED Requirements

### Requirement: Settings screen displays versions and updates
The panel SHALL display in the Settings screen a versions section with current plugin and openspec CLI versions, available updates, and control buttons.

#### Scenario: Display plugin version
- **WHEN** Settings screen is open
- **THEN** "Plugin version" line is shown on the left and current version value (e.g., `0.2.0`) on the right on the same line

#### Scenario: Plugin update available
- **WHEN** `pluginUpdate` is not `null`
- **THEN** below the version line, text "x.y.z version available" and an Update button in the next line are displayed

#### Scenario: Display openspec CLI version
- **WHEN** Settings screen is open
- **THEN** "OpenSpec CLI" line is shown on the left and current version value (`generatedBy`) on the right; if version not determined – "unknown"

#### Scenario: CLI update available
- **WHEN** `cliUpdate` is not `null`
- **THEN** below the version line, text "x.y.z version available" and an Update button in the next line are displayed

#### Scenario: Check Versions button
- **WHEN** Settings screen is open
- **THEN** at the bottom of the versions section a Check Versions button is displayed, which calls the plugin function `checkVersions` (without agent turn) to restart update checking

#### Scenario: Click Update for component
- **WHEN** the user clicks Update on the plugin or CLI line while agent is idle
- **THEN** plugin sends `buildUpdatePrompt` with that component via `sendPrompt`, buttons are locked until agent turn completes; after update, "Reload opencode to update plugin" message and Reload button (`error`) closing opencode are displayed

#### Scenario: Update blocked while agent is working
- **WHEN** agent is busy and user clicks Update or Update All
- **THEN** prompt is not sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Update All button
- **WHEN** at least one update is available (plugin or CLI)
- **THEN** at the bottom of the versions section an Update All button is displayed, which sends `buildUpdatePrompt` only with actually outdated components

#### Scenario: No updates – Update All hidden
- **WHEN** no updates available or check hasn't run yet
- **THEN** Update All button is not displayed, only Check Versions is visible
