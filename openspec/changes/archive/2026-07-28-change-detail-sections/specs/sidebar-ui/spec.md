## ADDED Requirements

### Requirement: Reading artifacts of open change
The sidebar SHALL read `proposal.md` and `design.md` of a change once – on opening it – and SHALL not include this reading in the periodic poll. The sidebar SHALL first obtain a list of files in the change directory and read only existing ones. A read error SHALL be treated as artifact absence and SHALL not reset summary. Read content SHALL be passed to `ChangeDetail` via props.

#### Scenario: Opening a change
- **WHEN** user selects a change from the list
- **THEN** the change directory is read once, and its artifacts are passed to `ChangeDetail`

#### Scenario: Poll does not grow more expensive
- **WHEN** another three-second poll tick occurs
- **THEN** `proposal.md` and `design.md` are not read – the poll still only reads `tasks.md`, specifications, `config.yaml`, and command list

#### Scenario: Changing selected change
- **WHEN** user returns to the list and opens a different change
- **THEN** previously read artifacts of the prior change are reset, and new ones are read again

#### Scenario: Artifact unavailable
- **WHEN** reading an artifact file ends with an error
- **THEN** the artifact is considered missing, summary is preserved, and initialization state does not change
