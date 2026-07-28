## MODIFIED Requirements

### Requirement: Action row in overview
The sidebar SHALL display at the top a header row with "OpenSpec" text, a version hover hint across the entire row, and a Settings button on the right, as well as an action row with Explore, Propose, and Archive buttons.

#### Scenario: Explore and Propose
- **WHEN** the user clicks Explore or Propose
- **THEN** `/opsx-explore ` or `/opsx-propose ` is appended to the prompt without sending; cursor is ready for description input

#### Scenario: Archive visible with completed changes
- **WHEN** the number of completed changes is greater than zero
- **THEN** the action row displays an Archive button in `success` color

#### Scenario: Launch Archive
- **WHEN** the user clicks Archive
- **THEN** the command `/opsx-archive` is sent as an agent turn (input cleared before sending); with one completed change its name is passed immediately, with multiple changes the command asks for selection

#### Scenario: Version hover on header row
- **WHEN** the cursor is over any part of the sidebar header row
- **THEN** next to "OpenSpec" text the plugin version is displayed (e.g., `0.2.0`, color `textMuted`)

#### Scenario: Hide version when cursor leaves
- **WHEN** the cursor moves away from the header row
- **THEN** the version is hidden, Settings button returns to `textMuted` color

#### Scenario: Settings button at rest
- **WHEN** sidebar displays overview or any detail view and cursor is not on the header row
- **THEN** a Settings button in `textMuted` color is displayed on the right in the header

#### Scenario: Settings button on row hover
- **WHEN** the cursor is over the header row
- **THEN** the Settings button changes to `warn` color

#### Scenario: Click Settings button
- **WHEN** the user clicks the Settings button
- **THEN** the Settings screen opens, overlaying current content
