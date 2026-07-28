## MODIFIED Requirements

### Requirement: Initialization indicator
The sidebar SHALL display a compact status line with the current phase name and an animated running dot for the entire duration of setup, without covering the browser.

#### Scenario: Display during setup
- **WHEN** `setupInProgress` is `true`
- **THEN** above the sidebar content a status line appears with phase text and three dots; the browser remains visible if the project is already determined as initialized

#### Scenario: Tooling installation stage
- **WHEN** setup is in progress and the `tooling` stage is not marked in `plugin.init.done`
- **THEN** the status line reports OpenSpec installation

#### Scenario: Configuration setup stage
- **WHEN** setup is in progress, `done` contains `tooling`, but does not contain `config`
- **THEN** the status line reports project configuration

#### Scenario: Specification derivation stage
- **WHEN** setup is in progress, `done` contains `config`, but does not contain `specs`
- **THEN** the status line reports specification derivation

#### Scenario: Validation stage
- **WHEN** setup is in progress and `done` contains all three stages
- **THEN** the status line reports specification validation

#### Scenario: Dot animation
- **WHEN** setup is in progress
- **THEN** one of three dots is highlighted in `text` color, the others in `textMuted`, and the highlighted dot cycles every 500 ms

#### Scenario: Setup completion
- **WHEN** the session transitions from busy to idle after launching init
- **THEN** `setupInProgress` is cleared, the status line is hidden

### Requirement: Temporary command loading after initialization
The sidebar SHALL after initialization register the files written by the init command `/opsx-*` ephemerally so they work until restart, and uniformly prompt for a restart regardless of whether ephemeral registration succeeded – but only when setup is complete or dismissed.

#### Scenario: Restart prompt
- **WHEN** the init turn completed (busy to idle transition), the setup marker is removed, and commands are not loaded natively
- **THEN** above the action row appears text "Reload opencode to activate new commands and skills" in `warning` color with a "Reload OpenCode" button in `error` color that closes opencode – identical for both successful and failed ephemeral registration

#### Scenario: Action row when bridge works
- **WHEN** ephemeral registration succeeded
- **THEN** below the prompt the usual action row remains

#### Scenario: Action row on failed registration
- **WHEN** ephemeral registration could not be performed
- **THEN** the action row is not shown – its `/opsx-*` commands won't resolve anyway

#### Scenario: Hidden during agent work
- **WHEN** the agent is busy or commands are already loaded natively
- **THEN** the restart prompt is not shown

#### Scenario: Hidden before setup completion
- **WHEN** the marker `plugin.init.in-progress` is set in config.yaml
- **THEN** the restart prompt is not shown, even if commands were registered ephemerally

#### Scenario: Shown after marker removal
- **WHEN** the agent removed the marker after successful completion or via Dismiss
- **THEN** the restart prompt appears per normal rules

### Requirement: Initialization screen
The sidebar SHALL display the initialization screen when openspec tooling is not detected or setup did not reach the `tooling` checkpoint, and setup is not in progress.

#### Scenario: Show initialization screen
- **WHEN** the flag `initialised` is `false` and setup is not running (`setupInProgress` is `false`)
- **THEN** the `NotInitialised` component with an Init button is displayed

#### Scenario: Tooling not checkpointed despite existing directories
- **WHEN** the setup marker is set, the `tooling` stage is not marked in `done`, and `.opencode` and `openspec` already exist
- **THEN** the initialization screen still appears with a warning "Setup aborted – press "Init" to continue" in `warning` color, and the browser is not shown

#### Scenario: Init button disabled during agent work
- **WHEN** the user presses Init while the agent is busy
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" appears

#### Scenario: Pressing Init
- **WHEN** the user presses Init while the agent is idle
- **THEN** `setupInProgress` is set, ephemeral installation pending is marked, and an init prompt without completed stages is sent – setup starts from scratch regardless of `done` contents

#### Scenario: Initialization completed without tooling
- **WHEN** the initialization turn completed but the flag `initialised` remained `false`
- **THEN** above Init a warning "Setup aborted – press "Init" to continue" appears, and Init repeats from scratch

## ADDED Requirements

### Requirement: Live sidebar population during setup
The sidebar SHALL display the changes and specifications browser during the setup turn as soon as the project is determined as initialized.

#### Scenario: Browser during derivation
- **WHEN** setup is in progress and `initialised` is `true`
- **THEN** the changes and specifications sections are displayed and populate via regular polling, with the status line remaining above them

#### Scenario: Auto-expand specifications
- **WHEN** a specification appears for the first time during derivation
- **THEN** the Specifications section expands automatically

#### Scenario: Actions unavailable during turn
- **WHEN** setup is in progress and the user presses an action in the browser
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" appears

### Requirement: Unfinished setup banner
The sidebar SHALL display an unfinished-setup banner if config.yaml contains the marker `plugin.init.in-progress`, the `tooling` stage is checkpointed, and the agent is idle.

#### Scenario: Show banner
- **WHEN** the marker is set, `done` contains `tooling`, the agent is not busy, and setup is not running
- **THEN** a banner appears indicating the stage at which setup stopped, with Resume (`secondary`) and Dismiss (`warning`) buttons

#### Scenario: Stopped stage from checkpoints
- **WHEN** setup has stopped
- **THEN** the banner names the first uncheckedpointed stage: configuring project, deriving specifications, or validation

#### Scenario: Banner not shown before tooling checkpoint
- **WHEN** the marker is set but `done` does not contain `tooling`
- **THEN** the banner is not displayed; instead the initialization screen appears

#### Scenario: Press Resume
- **WHEN** the user presses Resume while the agent is idle
- **THEN** an init prompt assembled without stages from `plugin.init.done` is sent, and `setupInProgress` is set

#### Scenario: Resume disabled during agent work
- **WHEN** the agent is busy and the user presses Resume
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" appears

#### Scenario: Press Dismiss
- **WHEN** the user presses Dismiss while the agent is idle
- **THEN** a prompt that removes the `init:` block from config.yaml is sent to the agent, and no setup steps are executed

#### Scenario: Dismiss disabled during agent work
- **WHEN** the agent is busy and the user presses Dismiss
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" appears

#### Scenario: Marker removed by agent
- **WHEN** the agent completed setup or performed dismissal via Dismiss and removed the `init:` block from config.yaml
- **THEN** the next poll hides the banner
