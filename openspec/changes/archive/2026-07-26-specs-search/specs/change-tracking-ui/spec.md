## MODIFIED Requirements

### Requirement: Detail card header and back button
The system SHALL display the title "Active Change" or "Completed Change" depending on status and a back button to return to the list, using the shared DetailHeader primitive – so all detail screens have identical padding.

#### Scenario: Opening an active change
- **WHEN** the detail card opens for an unfinished change
- **THEN** the header shows "Active Change" in yellow, and a clickable "← back" button appears on the right

#### Scenario: Opening a completed change
- **WHEN** the detail card opens for a completed change
- **THEN** the header shows "Completed Change" in green

#### Scenario: Padding matches other detail screens
- **WHEN** any change's detail card is open
- **THEN** exactly one blank line appears above the title line, and no blank lines exist between the divider below the heading and the change name
