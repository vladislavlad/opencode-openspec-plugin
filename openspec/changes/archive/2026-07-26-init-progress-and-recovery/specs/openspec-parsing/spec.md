## MODIFIED Requirements

### Requirement: Root directory detection
The system SHALL sequentially check `openspec` and `.openspec` directories, selecting the first that contains subdirectories **or** a `config.yaml` file.

#### Scenario: openspec directory contains subdirectories
- **WHEN** the `openspec` directory contains at least one subdirectory
- **THEN** the system uses `openspec` as the root directory

#### Scenario: Immediately after openspec init
- **WHEN** the `openspec` directory does not contain subdirectories but contains a `config.yaml` file
- **THEN** the system uses `openspec` as the root directory and returns a summary with empty specification and change lists

#### Scenario: Only .openspec exists
- **WHEN** `openspec` is empty or absent, and `.openspec` contains subdirectories or `config.yaml`
- **THEN** the system uses `.openspec` as the root directory

#### Scenario: No directory found
- **WHEN** neither `openspec` nor `.openspec` contain subdirectories or `config.yaml`
- **THEN** the function returns null

## ADDED Requirements

### Requirement: Reading setup marker from config.yaml
The system SHALL read `openspec/config.yaml` (roots `openspec` and `.openspec`) and return the unfinished-setup flag `plugin.init.in-progress` along with the list of completed stages `plugin.init.done`.

#### Scenario: Marker set before installation
- **WHEN** config.yaml contains `plugin.init.in-progress` with value true and an empty `done` list
- **THEN** the unfinished-setup flag is returned with an empty list of completed stages

#### Scenario: Stages checkpointed
- **WHEN** `plugin.init.done` lists stages
- **THEN** they are returned in file order

#### Scenario: Marker removed
- **WHEN** config.yaml does not contain a `plugin.init` block
- **THEN** the unfinished-setup flag is false, completed stages list is empty

#### Scenario: Unknown stage values
- **WHEN** `plugin.init.done` contains values outside the set `tooling`, `config`, `specs` or is not a list
- **THEN** unknown values are dropped, and a non-list yields an empty list

#### Scenario: Configuration unavailable or corrupted
- **WHEN** config.yaml is missing or does not parse as YAML
- **THEN** the flag is false, list is empty, no error is thrown
