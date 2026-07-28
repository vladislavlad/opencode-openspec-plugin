## Purpose
Initial project setup from the sidebar: installing OpenSpec CLI, configuring the project and deriving specifications with progress tracking via checkpoints, an incomplete-setup marker, and resuming interrupted turns.

## Requirements

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
- **THEN** `setupInProgress` is set, ephemeral installation is marked as pending, marker is written with `done` reset, and initialization prompt is sent without completed stages — setup starts from scratch regardless of previous `done` contents

#### Scenario: Initialization Completed Without Tooling
- **WHEN** the init turn completes but `initialised` flag remains `false`
- **THEN** above Init button a warning "Setup aborted – press "Init" to continue" is shown, and Init button retries from scratch

### Requirement: Live Sidebar Population During Setup
The sidebar SHALL display the change and specification browser during setup as soon as the project is identified as initialized.

#### Scenario: Browser During Derivation
- **WHEN** setup is in progress and `initialised` is `true`
- **THEN** change and specification sections are displayed and populated via regular polling, and status line remains above them

#### Scenario: Auto-expanding Specifications
- **WHEN** a specification appears for the first time during derivation
- **THEN** the Specifications section expands automatically

#### Scenario: Actions Unavailable During Turn
- **WHEN** setup is in progress and user presses an action in the browser
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" is shown

### Requirement: Incomplete Setup Banner
The sidebar SHALL display an incomplete setup banner if `plugin.init.in-progress` marker remains in config.yaml, stage `tooling` is checkpointed, and the agent is idle.

#### Scenario: Showing Banner
- **WHEN** marker is set, `done` contains `tooling`, agent is not busy and setup is not running
- **THEN** a banner is displayed indicating the stage where setup stopped, with Resume button (`secondary`) and Dismiss button (`warning`)

#### Scenario: Stop Stage From Checkpoints
- **WHEN** setup has stopped
- **THEN** the banner names the first non-checkpointed stage: project configuration, specification derivation or validation

#### Scenario: Banner Not Shown Before Tooling Checkpoint
- **WHEN** marker is set but `done` doesn't contain `tooling`
- **THEN** banner is not displayed, initialization screen is shown instead

#### Scenario: Pressing Resume
- **WHEN** the user presses Resume while agent is idle
- **THEN** marker is rewritten preserving `done`, state is re-read, and only then initialization prompt is sent assembled without already completed stages; `setupInProgress` is set

#### Scenario: State Not Taken From Stale Poll
- **WHEN** assembling prompt for Resume
- **THEN** the list of completed stages is read fresh immediately before sending, not taken from the last poll which may lag by several seconds

#### Scenario: Resume Locked During Agent Work
- **WHEN** agent is busy and user presses Resume
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Pressing Dismiss
- **WHEN** the user presses Dismiss and config.yaml is accessible
- **THEN** the sidebar removes the `init:` block itself and immediately re-reads state — banner disappears instantly, no agent turn wasted

#### Scenario: Dismiss With Inaccessible Files
- **WHEN** the user presses Dismiss and config.yaml is inaccessible or corrupted
- **THEN** a prompt removing the `init:` block is sent to the agent, and no setup steps are executed

#### Scenario: Agent-Mediated Dismiss Locked During Work
- **WHEN** agent is busy, files are inaccessible and user presses Dismiss
- **THEN** no prompt is sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Marker Removed By Agent
- **WHEN** agent completed setup or executed removal on Dismiss and removed `init:` block from config.yaml
- **THEN** next poll hides the banner

### Requirement: Initialization Indicator
The sidebar SHALL display a compact status line with current phase name and animated running dots for the entire duration of setup, without covering the browser.

#### Scenario: Display During Setup
- **WHEN** `setupInProgress` is `true`
- **THEN** above sidebar content a status line is shown with phase text and three dots; browser remains visible if project is already identified as initialized

#### Scenario: Tooling Installation Stage
- **WHEN** setup is in progress and stage `tooling` is not marked in `plugin.init.done`
- **THEN** status line indicates OpenSpec installation

#### Scenario: Configuration Setup Stage
- **WHEN** setup is in progress, `done` contains `tooling` but not `config`
- **THEN** status line indicates project configuration

#### Scenario: Specification Derivation Stage
- **WHEN** setup is in progress, `done` contains `config` but not `specs`
- **THEN** status line indicates specification derivation

#### Scenario: Validation Stage
- **WHEN** setup is in progress and `done` contains all three stages
- **THEN** status line indicates specification validation

#### Scenario: Dot Animation
- **WHEN** setup is in progress
- **THEN** one of three dots is highlighted in `text` color, others in `textMuted`, and the highlighted dot moves cyclically every 500ms

#### Scenario: Setup Completion
- **WHEN** session transitions from busy to idle after init launch
- **THEN** `setupInProgress` is cleared, status line is hidden

### Requirement: Temporary Command Loading After Initialization
After initialization, the sidebar SHALL register `/opsx-*` command files written by init as ephemeral palette commands so they work until restart, and equally prompt for restart regardless of whether ephemeral registration succeeded — but only when setup is complete or dismissed.

#### Scenario: Restart Prompt
- **WHEN** init turn completed (busy to idle transition), setup marker removed, and commands are not loaded natively
- **THEN** above action row text "Reload opencode to activate new commands and skills" in `warning` color and "Reload OpenCode" button in `error` color closing opencode is shown — same for both successful and failed ephemeral registration

#### Scenario: Action Row With Working Bridge
- **WHEN** ephemeral registration succeeded
- **THEN** normal action row remains below the prompt

#### Scenario: Action Row On Failed Registration
- **WHEN** ephemeral registration could not be performed
- **THEN** action row is not shown — commands `/opsx-*` it would insert won't resolve anyway

#### Scenario: Hidden During Agent Work
- **WHEN** agent is busy or commands are already loaded natively
- **THEN** restart prompt is not displayed

#### Scenario: Hidden Before Setup Completion
- **WHEN** marker `plugin.init.in-progress` is set in config.yaml
- **THEN** restart prompt is not shown, even if commands were registered ephemerally

#### Scenario: Shown After Marker Removal
- **WHEN** marker removed by agent after successful completion or on Dismiss
- **THEN** restart prompt is displayed per normal rules

### Requirement: Ephemeral Registration of openspec init Commands
The system SHALL register `/opsx-*` command files written by `openspec init` from `.opencode/commands` as ephemeral palette commands so they work in the current session until restart.

#### Scenario: Registration From Files
- **WHEN** `registerOpsxFsCommands` is called and command files are present
- **THEN** for each command (`opsx-apply`, `opsx-archive`, `opsx-explore`, `opsx-propose`, `opsx-sync`, `opsx-update`) a palette command is registered whose `run` sends the file body (without frontmatter) as prompt

#### Scenario: Idempotency
- **WHEN** `registerOpsxFsCommands` is called again
- **THEN** commands already registered in this session are skipped, no duplicates created

### Requirement: Initialization Prompt — CLI Availability Guarantee
The system SHALL ensure CLI `openspec` availability before running `openspec init` in the initialization prompt.

#### Scenario: CLI Installed
- **WHEN** `openspec --version` completes successfully
- **THEN** `openspec init --tools opencode` is executed immediately

#### Scenario: CLI Missing
- **WHEN** `openspec --version` is not found
- **THEN** available package managers (`npm`, `pnpm`, `yarn`, `bun`) are identified, and via `question` global installation with chosen manager or cancellation (`Cancel`) interrupting the entire process is offered

### Requirement: Initialization Prompt Manages Setup Marker
The initialization prompt SHALL ensure marker `plugin.init.in-progress: true` exists in `openspec/config.yaml` before CLI installation and instruct agent to remove entire `init:` block only after successful validation. The marker write step SHALL be assembled based on whether the sidebar wrote the marker itself, and SHALL distinguish two cases — file already exists and file doesn't exist.

#### Scenario: Marker Already Written By Sidebar
- **WHEN** prompt is assembled with indication that sidebar set the marker
- **THEN** first step only states that `plugin.init` block already exists and should be left as-is, and YAML write instruction does not appear in prompt

#### Scenario: Configuration File Already Exists
- **WHEN** prompt is assembled without this indication, but `openspec/config.yaml` exists in project
- **THEN** agent is told to add `plugin.init` block and change nothing else — including not overwriting `schema`

#### Scenario: No Configuration File
- **WHEN** prompt is assembled without this indication and `openspec/config.yaml` is absent
- **THEN** agent is told to create file along with `openspec/` directory, writing `schema: spec-driven` and `plugin.init` block

#### Scenario: Step Order Doesn't Change
- **WHEN** prompt is assembled either way
- **THEN** remaining preflight steps and their numbering are identical, and marker ends up in place before CLI installation in both cases

#### Scenario: Marker Removal After Validation
- **WHEN** setup is complete and `openspec validate --specs` passes
- **THEN** agent removes entire `init:` block under `plugin:`, preserving `schema`, `context`, `rules` and other `plugin:` entries

#### Scenario: Validation Fails
- **WHEN** after fixes validation still fails
- **THEN** `init:` block remains in config.yaml so sidebar can offer to continue

#### Scenario: Marker Removal On Derivation Decline
- **WHEN** user declined to derive specifications or project turned out empty
- **THEN** agent still reaches final section and removes marker

#### Scenario: Setup Interruption
- **WHEN** agent turn is interrupted before setup completion
- **THEN** marker remains in config.yaml serving as incomplete-setup indicator

### Requirement: Initialization Prompt Checkpoints Completed Stages
The initialization prompt SHALL instruct agent to write cumulative list of completed stages to `plugin.init.done` after each one: `tooling`, `config`, `specs`.

#### Scenario: Installation Stage Passed
- **WHEN** `openspec init` ran successfully
- **THEN** agent writes `plugin.init.done` equal to `["tooling"]`

#### Scenario: Configuration Stage Passed
- **WHEN** `openspec/config.yaml` is configured
- **THEN** agent writes `plugin.init.done` equal to `["tooling", "config"]`

#### Scenario: Derivation Stage Passed
- **WHEN** specifications are derived
- **THEN** agent writes `plugin.init.done` equal to `["tooling", "config", "specs"]`

### Requirement: Initialization Prompt Skips Completed Stages
The initialization prompt SHALL be assembled from installation, configuration and derivation stages, including only those not yet marked in `plugin.init.done`.

#### Scenario: First Run
- **WHEN** prompt is assembled without completed stages
- **THEN** it contains marker step, CLI installation and `openspec init`, configuration step and derivation step, with marker step preceding installation

#### Scenario: Retry After Tooling Installation
- **WHEN** prompt is assembled with stage `tooling` completed
- **THEN** it doesn't contain `openspec init` command, explicitly forbids re-running it, and starts from configuration step

#### Scenario: Retry After Configuration
- **WHEN** prompt is assembled with stages `tooling` and `config` completed
- **THEN** it doesn't contain configuration step, instructs to leave `context` and `rules` unchanged, and starts from derivation step

#### Scenario: Retry After Derivation
- **WHEN** prompt is assembled with all stages completed
- **THEN** it contains only validation and marker removal

#### Scenario: Tooling Not Passed With Later Stages Passed
- **WHEN** prompt is assembled with `tooling` not passed but later stages completed
- **THEN** it again contains installation and `openspec init`

#### Scenario: Marker Removal In Any Variant
- **WHEN** prompt is assembled with any set of completed stages
- **THEN** it contains step to remove `init:` block

### Requirement: Setup Marker Dismissal Prompt
The system SHALL provide a separate prompt that removes `init:` block from `openspec/config.yaml` and performs no other setup steps. This prompt — fallback path: normally sidebar removes marker itself without spending agent turn.

#### Scenario: Dismissal On Dismiss
- **WHEN** dismissal prompt is sent
- **THEN** it contains removal of `init:` block and doesn't contain setup, derivation or `openspec init` steps

### Requirement: Fallback Initialization Prompt Removes Marker
Fallback initialization prompt (when baseline command is not registered) SHALL install tooling and remove marker without performing configuration and derivation.

#### Scenario: Installation Without Subsequent Stages
- **WHEN** fallback initialization prompt is used
- **THEN** it contains `openspec init` and removal of `init:` block, but doesn't contain derivation step

#### Scenario: Same Marker-Written Indication
- **WHEN** fallback prompt is assembled with indication that sidebar already set marker
- **THEN** marker step collapses the same way as in main initialization prompt

### Requirement: Final Init Section Removes Marker Without Extra Validation
Final section of init prompt SHALL remove setup marker in all cases except one — specification validation still fails after fixes. Re-validation SHALL be skipped when derivation step already ran it or when project has no specifications. Instruction about marker fate SHALL stand at the stop itself: installation step on `openspec init` failure directly instructs to leave config.yaml with marker for Resume. Work invitation SHALL sound only when marker is removed, and SHALL start by stating OpenSpec is configured.

#### Scenario: Empty Project
- **WHEN** derivation didn't run or produced no specifications
- **THEN** validation is skipped but marker is still removed — sidebar doesn't remain in incomplete-setup state

#### Scenario: Same Ending For Any Successful Outcome
- **WHEN** marker removed — specs derived, derivation declined or nothing to derive
- **THEN** ending is the same: message that OpenSpec is configured and ready, then two sidebar buttons — **Explore** and **Propose** — and commands `/opsx-explore` and `/opsx-propose` equivalent in action

#### Scenario: Derivation Didn't Cover Project Fully
- **WHEN** final section reaches greeting
- **THEN** it mentions `/opsx-baseline` as a way to supplement specifications: re-run refines and extends existing ones, doesn't duplicate them

#### Scenario: Derivation Already Validated
- **WHEN** derivation step completed by running `openspec validate --specs` in this same turn
- **THEN** final section doesn't run validation again

#### Scenario: Validation Fails
- **WHEN** after fixes `openspec validate --specs` still reports errors
- **THEN** `init:` block remains in config.yaml, agent reports what exactly is broken, and doesn't invite to Explore/Propose

#### Scenario: Final Section Assembled For Included Stages
- **WHEN** prompt is assembled without installation step or without derivation step
- **THEN** final section doesn't mention absent steps: neither installation stops nor "No" answer on derivation

#### Scenario: Failed openspec init Leaves Marker
- **WHEN** `openspec init` ended with error
- **THEN** turn stops with error message, and installation step itself instructs to leave config.yaml with marker — sidebar will offer Resume

### Requirement: CLI Installation Cancellation Cleans Up By Verifiable Rule
The initialization prompt SHALL describe cleanup after CLI installation cancellation as mechanically verifiable steps without requiring agent knowledge of what existed before turn start. After cancellation final section is not executed — marker is removed during cleanup stage.

#### Scenario: Cleanup After Cancellation
- **WHEN** user selected "Cancel" on package manager question
- **THEN** agent removes `init:` block; deletes `openspec/config.yaml` only if nothing remains except `schema`; deletes `openspec/` directory only if it turned out empty

#### Scenario: Foreign Config Remains In Place
- **WHEN** `openspec/config.yaml` already had `context` or `rules` before turn start
- **THEN** after cancellation file remains with that content, stripped only of `init:` block
