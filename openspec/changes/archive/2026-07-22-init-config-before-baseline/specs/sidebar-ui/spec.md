## MODIFIED Requirements

### Requirement: Initialization screen
The sidebar SHALL display an initialization screen when openspec tooling is not detected in the project.

#### Scenario: Display initialization screen
- **WHEN** the `initialised` flag equals `false`
- **THEN** the `NotInitialised` component with an init button is displayed

#### Scenario: Click init button
- **WHEN** the user clicks the init button
- **THEN** the prompt `OPENSPEC_INIT_PROMPT` is sent, which executes the sequence: install openspec → configure config.yaml (always) → optionally derive specs

#### Scenario: Skip baseline
- **WHEN** the user declines derivation specs during init
- **THEN** the project remains with installed openspec and configured config.yaml, ready for manual `/opsx-baseline` run later
