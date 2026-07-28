## Purpose
Registering OpenSpec's own slash commands in OpenCode palette — `/opsx-config` and `/opsx-baseline` — with prompt template binding, argument passing and registration error handling. Prompt contents belong to `project-config` and `spec-derivation`; temporary registration of recorded `openspec init` commands belongs to `init-flow`.

## Requirements

### Requirement: Registering /opsx-baseline Command
System SHALL register slash command `/opsx-baseline` in `palette` namespace with name `openspec.baseline`, category `OpenSpec` and prompt `SPEC_BASELINE_PROMPT`. Command description SHALL match what the prompt actually does: it doesn't perform configuration, but requires it beforehand.

#### Scenario: Successful Baseline Registration
- **WHEN** function `registerCommands` is called with valid API
- **THEN** command `/opsx-baseline` is available in palette with title "OpenSpec: Baseline specs from code" and description "Derive or refresh openspec/specs from the existing implementation (needs a configured project)"

### Requirement: Registering /opsx-config Command
System SHALL register slash command `/opsx-config` in `palette` namespace with name `openspec.config`, category `OpenSpec` and prompt `CONFIG_PROMPT`.

#### Scenario: Successful Config Registration
- **WHEN** function `registerCommands` is called with valid API
- **THEN** command `/opsx-config` is available in palette with title "OpenSpec: Configure project context" and description "Set stack, spec language and context in openspec/config.yaml"

### Requirement: Clearing Input And Submitting Prompt
System SHALL clear current user input and automatically submit bound prompt template when executing any registered command, appending text entered after slash.

#### Scenario: Executing /opsx-config Command
- **WHEN** user selects `/opsx-config` from palette
- **THEN** input text is cleared, and `CONFIG_PROMPT` content is sent to model

#### Scenario: Executing /opsx-baseline Command
- **WHEN** user selects `/opsx-baseline` from palette
- **THEN** input text is cleared, and `SPEC_BASELINE_PROMPT` content is sent to model

#### Scenario: Passing Arguments
- **WHEN** text is entered after command name (e.g., Change name)
- **THEN** this text is appended to prompt as command arguments

### Requirement: Safe Registration Error Handling
System SHALL catch exceptions during command registration and show error via toast, without interrupting rest of interface.

#### Scenario: Single Command Registration Error
- **WHEN** command registration ends with error
- **THEN** toast displays with `error` variant and message like `openspec: failed to register /<slashName> (<reason>)`, and function returns `false` for this command

### Requirement: Returning Baseline Availability
System SHALL return object `{ baselineAvailable: boolean }`, indicating whether `/opsx-baseline` command registered successfully.

#### Scenario: Baseline Registered
- **WHEN** registration of `/opsx-baseline` completes without errors
- **THEN** `registerCommands` returns `{ baselineAvailable: true }`

#### Scenario: Baseline Not Registered
- **WHEN** registration of `/opsx-baseline` ends with error
- **THEN** `registerCommands` returns `{ baselineAvailable: false }`
