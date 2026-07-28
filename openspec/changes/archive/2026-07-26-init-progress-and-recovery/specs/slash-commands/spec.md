## ADDED Requirements

### Requirement: Init prompt manages the setup marker
The init prompt SHALL instruct the agent to create the marker `plugin.init.in-progress: true` in `openspec/config.yaml` before CLI installation and remove the entire `init:` block only after successful validation.

#### Scenario: Marker before installation
- **WHEN** the init prompt begins execution
- **THEN** the agent creates `openspec/config.yaml` if needed and writes `schema` along with `plugin.init.in-progress: true` and an empty `done` – before checking and installing CLI

#### Scenario: Cancel CLI installation
- **WHEN** the user chooses "Cancel" at the package manager question
- **THEN** the agent removes the created `init:` block (as well as `openspec/config.yaml` and the `openspec/` directory created in this turn, if nothing else is in them) and stops

#### Scenario: Marker removal after validation
- **WHEN** setup is complete and `openspec validate --specs` passes
- **THEN** the agent removes the entire `init:` block under `plugin:`, preserving `schema`, `context`, `rules`, and other `plugin:` entries

#### Scenario: Validation fails
- **WHEN** after fixes validation still does not pass
- **THEN** the `init:` block remains in config.yaml so the sidebar can offer to continue

#### Scenario: Marker removal when declining derivation
- **WHEN** the user declined to derive specifications or the project turned out empty
- **THEN** the agent still reaches the final section and removes the marker

#### Scenario: Setup interruption
- **WHEN** the agent turn is interrupted before setup completion
- **THEN** the marker remains in config.yaml and serves as an indicator of unfinished setup

### Requirement: Init prompt checkpoints completed stages
The init prompt SHALL instruct the agent to write an accumulating list of completed stages to `plugin.init.done` after each one: `tooling`, `config`, `specs`.

#### Scenario: Installation stage passed
- **WHEN** `openspec init` ran successfully
- **THEN** the agent writes `plugin.init.done` equal to `["tooling"]`

#### Scenario: Configuration stage passed
- **WHEN** `openspec/config.yaml` is configured
- **THEN** the agent writes `plugin.init.done` equal to `["tooling", "config"]`

#### Scenario: Derivation stage passed
- **WHEN** specifications are derived
- **THEN** the agent writes `plugin.init.done` equal to `["tooling", "config", "specs"]`

### Requirement: Init prompt skips completed stages
The init prompt SHALL be assembled from installation, configuration, and derivation stages, including only those not yet marked in `plugin.init.done`.

#### Scenario: First run
- **WHEN** the prompt is assembled without completed stages
- **THEN** it contains marker writing, CLI installation and `openspec init`, a configuration step, and a derivation step, with the marker written before installation

#### Scenario: Repeat after tooling installation
- **WHEN** the prompt is assembled with the `tooling` stage passed
- **THEN** it does not contain the `openspec init` command, explicitly forbids re-running it, and starts from the configuration step

#### Scenario: Repeat after configuration
- **WHEN** the prompt is assembled with `tooling` and `config` stages passed
- **THEN** it does not contain a configuration step, instructs to leave `context` and `rules` unchanged, and starts from the derivation step

#### Scenario: Repeat after derivation
- **WHEN** the prompt is assembled with all stages passed
- **THEN** it contains only validation and marker removal

#### Scenario: Tooling not passed while later stages are passed
- **WHEN** the prompt is assembled with `tooling` not passed but later stages passed
- **THEN** it again contains installation and `openspec init`

#### Scenario: Marker removal in any variant
- **WHEN** the prompt is assembled with any set of completed stages
- **THEN** it contains a step to remove the `init:` block

### Requirement: Setup marker dismiss prompt
The system SHALL provide a separate prompt that removes the `init:` block from `openspec/config.yaml` and performs no other setup steps.

#### Scenario: Dismiss via Dismiss
- **WHEN** the marker dismiss prompt is sent
- **THEN** it contains removal of the `init:` block and does not contain setup, derivation, or `openspec init` steps

### Requirement: Fallback init prompt removes marker
The fallback init prompt (when baseline command is not registered) SHALL install tooling and remove the marker without performing configuration and derivation.

#### Scenario: Installation without subsequent stages
- **WHEN** the fallback init prompt is used
- **THEN** it contains `openspec init` and removal of the `init:` block, but does not contain a derivation step

### Requirement: CONFIG_PROMPT preserves the plugin service block
The prompt `CONFIG_PROMPT` SHALL instruct the agent to preserve an existing `plugin:` block in `openspec/config.yaml` unchanged when overwriting the file.

#### Scenario: Configuration overwrite with setup marker
- **WHEN** the agent overwrites config.yaml at the configuration step and `plugin.init` is present in the file
- **THEN** the `plugin:` block is preserved in the file unchanged

#### Scenario: Configuration overwrite with update flag
- **WHEN** the agent overwrites config.yaml and `plugin.update-in-progress` is present in the file
- **THEN** the `plugin:` block is preserved in the file unchanged
