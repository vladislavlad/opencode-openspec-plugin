## Purpose
Project configuration prompt: defining stack, specification language, context and rules with writing them to `openspec/config.yaml`. Assembled in two forms — as separate command `/opsx-config` and as step within initialization prompt.

## Requirements

### Requirement: CONFIG_PROMPT — Initialization Presence Check
The system SHALL check for directory `openspec/` before executing configuration and require running initialization when it's absent. Separate command `/opsx-config` checks for directory presence, while configuration step inside init prompt doesn't: installation earlier in that same prompt just created `openspec/`.

#### Scenario: OpenSpec Not Initialized
- **WHEN** prompt `/opsx-config` runs in project without directory `openspec/`
- **THEN** model informs user about need to run OpenSpec initialization and stops

#### Scenario: Step Inside Init
- **WHEN** configuration step is assembled as part of init prompt
- **THEN** it doesn't contain check for `openspec/` — directory was created at installation step earlier in same prompt

### Requirement: CONFIG_PROMPT — Empty Project And Language Handling
The system SHALL NOT attempt to derive context from empty project and offer only human languages.

#### Scenario: Empty Project
- **WHEN** project has no code, README or manifests
- **THEN** prompt skips context derivation and immediately asks user for stack, language, context and style without offering to create or select another project

#### Scenario: Spec Language
- **WHEN** prompt asks specification language
- **THEN** only natural (human) languages are offered, not programming languages

### Requirement: CONFIG_PROMPT Preserves Plugin Block
Prompt `CONFIG_PROMPT` SHALL instruct agent to preserve existing block `plugin:` in `openspec/config.yaml` unchanged when overwriting file.

#### Scenario: Configuration Overwrite With Setup Marker
- **WHEN** agent overwrites config.yaml at configuration step and `plugin.init` is present in file
- **THEN** block `plugin:` is preserved in file unchanged

#### Scenario: Configuration Overwrite With Update Flag
- **WHEN** agent overwrites config.yaml and `plugin.update-in-progress` is present in file
- **THEN** block `plugin:` is preserved in file unchanged

### Requirement: CONFIG_PROMPT — Task Granularity Two Options
`CONFIG_PROMPT` SHALL offer exactly two levels of Task granularity — "High-level" and "Detailed" — and describe them by work volume, not execution time.

#### Scenario: Tasks Question Composition
- **WHEN** user answered "Yes" to question "Configure detailed rules?"
- **THEN** "Tasks" question offers exactly two options: "High-level" with description "a few high-level tasks" and "Detailed" with description "sub-tasks grouped under high-level sections"

#### Scenario: Hints Don't Measure Time
- **WHEN** configuration prompt is assembled
- **THEN** it doesn't contain options "Coarse", "Medium", "Fine" and doesn't describe Tasks by duration ("~half-day", "~1-2h")

#### Scenario: Rule In Config
- **WHEN** user selected "High-level"
- **THEN** `rules.tasks` receives rule "a few high-level tasks"

#### Scenario: Rule In Config For Detailed Granularity
- **WHEN** user selected "Detailed"
- **THEN** `rules.tasks` receives rule "sub-tasks grouped under high-level sections"
