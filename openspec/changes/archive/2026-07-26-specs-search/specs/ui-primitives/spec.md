## MODIFIED Requirements

### Requirement: Divider draws horizontal line
The component SHALL render a horizontal line in `borderSubtle` color of the current theme, exactly to container width, occupying one line at any sidebar width.

#### Scenario: Divider displays with correct color
- **WHEN** the component renders with a valid theme
- **THEN** a horizontal line in theme.borderSubtle color is visible on screen

#### Scenario: Narrow sidebar
- **WHEN** sidebar width is less than default line length
- **THEN** the line occupies exactly one line across full width, without wrapping remainder to next line

### Requirement: DetailHeader shows heading and back button
The component SHALL display a bold label on the left – in accent color or via `color` prop –, a clickable "← back" on the right with background highlight on hover, a Divider below the heading line, and a blank line above it.

#### Scenario: Heading and back button visible
- **WHEN** the component renders with label "Tasks"
- **THEN** bold text "Tasks" in accent color appears on left, "← back" on right, divider below

#### Scenario: Back button responds to hover
- **WHEN** cursor is over the "← back" area
- **THEN** background fills with `accent` color, and text changes to `background`

#### Scenario: Custom heading color
- **WHEN** component receives `color` prop
- **THEN** label displays in that color instead of accent

## ADDED Requirements

### Requirement: ClearButton clears input field
The system SHALL provide a ClearButton primitive – clickable "✕" with one-character right padding, muted at rest and with accent fill on hover, like the "← back" button.

#### Scenario: Button at rest
- **WHEN** ClearButton is rendered and cursor is not over it
- **THEN** "✕" displays in `textMuted` color without background, with one-character right padding

#### Scenario: Highlight on hover
- **WHEN** cursor is over ClearButton
- **THEN** background fills with `accent` color, and glyph changes to `background`

#### Scenario: Clear on click
- **WHEN** the user clicks mouse on ClearButton
- **THEN** onClear handler is called
