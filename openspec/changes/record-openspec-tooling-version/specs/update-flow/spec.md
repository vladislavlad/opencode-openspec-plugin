## MODIFIED Requirements

### Requirement: Sources Of Installed Versions

The plugin version SHALL come from the build constant `__PLUGIN_VERSION__` and SHALL equal `dev` for unbuilt source imports. Settings SHALL show the last verified project tooling version from `plugin.tooling-version` in `openspec/config.yaml`, falling back to legacy `generatedBy` stamps when available.

#### Scenario: Plugin Version From Build
- **WHEN** the plugin is bundled by `build.ts`
- **THEN** the version equals the package manifest version

#### Scenario: Dev Checkout
- **WHEN** the plugin is imported without build substitution
- **THEN** the version equals `dev`

#### Scenario: Recorded Version Takes Precedence
- **WHEN** project configuration carries a valid tooling version
- **THEN** Settings displays it and uses it to determine whether an OpenSpec update is available

#### Scenario: CLI Version Found
- **WHEN** a project has no valid recorded tooling version and its generated skill carries `generatedBy`
- **THEN** Settings displays the legacy stamp

#### Scenario: CLI Version Not Determined
- **WHEN** neither a recorded version nor a legacy stamp is available
- **THEN** Settings shows "Not checked" and offers Refresh OpenSpec even when npm is unreachable

### Requirement: Update Prompt

The system SHALL include only requested components in an update prompt. The agent SHALL update the plugin specifier in the global `cli.json` and SHALL verify and refresh CLI tooling with `openspec update` when requested.

#### Scenario: Finding tui.json
- **WHEN** the plugin update is requested
- **THEN** the prompt targets the effective global `cli.json` and leaves the legacy file intact

#### Scenario: Plugin Array Entry Can Be String Or Tuple
- **WHEN** the current `cli.json` entry is a string or an object, including options transferred from a legacy tuple
- **THEN** the agent changes the package specifier and preserves the options and other entries

#### Scenario: Dev Checkout Not Updated
- **WHEN** the plugin entry is a local path or file URL
- **THEN** the prompt instructs the agent to skip the plugin update and tell the user

#### Scenario: Update Flag Written Along With Edit
- **WHEN** the agent updates the plugin specifier
- **THEN** the prompt instructs it to write `plugin.update-in-progress` with the previous and new plugin versions

#### Scenario: CLI Setup or Refresh Verifies Tooling
- **WHEN** the agent successfully completes OpenSpec initialization or refresh, including a refresh with zero changes
- **THEN** it records the version returned by `openspec --version` under `plugin.tooling-version` and preserves the rest of the project configuration

#### Scenario: Failed CLI Setup or Refresh
- **WHEN** the CLI cannot verify the tooling or the update fails
- **THEN** the prompt instructs the agent to preserve the previous recorded version

#### Scenario: CLI Update Only
- **WHEN** the CLI-only refresh turn ends
- **THEN** the sidebar reloads the native catalog and reads the tooling version, with no plugin migration flag or restart prompt

#### Scenario: Prompt Completion
- **WHEN** the requested update includes the plugin
- **THEN** the restart prompt remains available to load the new build
