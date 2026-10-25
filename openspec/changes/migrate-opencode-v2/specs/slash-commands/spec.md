## MODIFIED Requirements

### Requirement: Registering /opsx-baseline Command
System SHALL register slash command `/opsx-baseline` through a V2 keymap layer with palette enabled, slash arguments enabled, ID `openspec.baseline`, group `OpenSpec` and prompt `SPEC_BASELINE_PROMPT`. Command description SHALL match what the prompt actually does: it doesn't perform configuration, but requires it beforehand.

#### Scenario: Successful Baseline Registration
- **WHEN** function `registerCommands` is called with valid API
- **THEN** command `/opsx-baseline` is available in palette with title "OpenSpec: Baseline specs from code" and description "Derive or refresh openspec/specs from the existing implementation (needs a configured project)"

### Requirement: Registering /opsx-config Command
System SHALL register slash command `/opsx-config` through a V2 keymap layer with palette enabled, slash arguments enabled, ID `openspec.config`, group `OpenSpec` and prompt `CONFIG_PROMPT`.

#### Scenario: Successful Config Registration
- **WHEN** function `registerCommands` is called with valid API
- **THEN** command `/opsx-config` is available in palette with title "OpenSpec: Configure project context" and description "Set stack, spec language and context in openspec/config.yaml"

### Requirement: Clearing Input And Submitting Prompt
Registered commands SHALL submit their bound template with trimmed native V2 string arguments appended as an Arguments section. They SHALL preserve unrelated text in the host composer and reject execution while the current session is running.

#### Scenario: Executing /opsx-config Command
- **WHEN** an idle user selects /opsx-config
- **THEN** CONFIG_PROMPT is submitted once without changing the main draft

#### Scenario: Executing /opsx-baseline Command
- **WHEN** an idle user selects /opsx-baseline
- **THEN** SPEC_BASELINE_PROMPT is submitted once

#### Scenario: Passing Arguments
- **WHEN** a user types an argument after the slash command or dispatches a string argument
- **THEN** the trimmed argument reaches the template

#### Scenario: Running Session
- **WHEN** a command is invoked while running
- **THEN** it displays wait feedback and sends nothing
