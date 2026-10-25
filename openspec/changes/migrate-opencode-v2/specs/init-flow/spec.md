## REMOVED Requirements

### Requirement: Ephemeral Registration of openspec init Commands
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Native Tooling Reload in plugin 2.0.0; V1 remains on plugin 1.0.0.

### Requirement: Temporary Command Loading After Initialization
**Reason**: V2 reloads the native catalog instead of bridging until restart.
**Migration**: Use Native Tooling Reload and Retry commands; a successful setup does not require restarting OpenCode.

## MODIFIED Requirements

### Requirement: Initialization Screen
The sidebar SHALL display the initialization screen when openspec tooling is not detected or setup hasn't reached the `tooling` checkpoint, and setup is not in progress.

#### Scenario: Showing Initialization Screen
- **WHEN** the `initialised` flag is `false` and setup is not running (`setupInProgress` is `false`)
- **THEN** the `NotInitialised` component with Init button is displayed

#### Scenario: Tooling Not Checkpointed With Existing Directories
- **WHEN** the setup marker is set, stage `tooling` is not marked in `done`, but `.opencode` and `openspec` already exist
- **THEN** the initialization screen is still displayed with warning "Setup aborted – press "Init" to continue" in `warning` color, and browser is not shown

#### Scenario: Init Button Locked During Agent Work
- **WHEN** the user presses Init while the agent is busy
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Pressing Init Button
- **WHEN** the user presses Init while the agent is idle
- **THEN** `setupInProgress` is set, native tooling reload is marked as pending, marker is written with `done` reset, and initialization prompt is sent without completed stages — setup starts from scratch regardless of previous `done` contents

#### Scenario: Initialization Completed Without Tooling
- **WHEN** the init turn completes but `initialised` flag remains `false`
- **THEN** above Init button a warning "Setup aborted – press "Init" to continue" is shown, and Init button retries from scratch

## ADDED Requirements

### Requirement: Native Tooling Reload
After initialization the plugin SHALL refresh V2 native commands and skills through client.location.reload and repoll availability. It SHALL NOT register temporary copies of command file prompts.

#### Scenario: Refresh After Setup
- **WHEN** the initialization turn ends
- **THEN** native location configuration is reloaded and the sidebar polls commands again; successfully loaded commands need no temporary registration or restart

#### Scenario: Reload Failed
- **WHEN** native reload fails
- **THEN** Retry commands guidance remains available without crashing the sidebar; it retries native reload, and command actions remain hidden until the catalog is ready

#### Scenario: Plugin Reload
- **WHEN** the plugin is disabled and enabled again
- **THEN** its native own commands register once and no module-global temporary commands remain
