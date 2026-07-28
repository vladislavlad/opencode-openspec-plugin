## Purpose
OpenSpec plugin settings screen: opening over sidebar content and returning to previous view. The versions and updates section belongs to `update-flow`.

## Requirements

### Requirement: Settings Screen Opens Over Content
Sidebar SHALL open the Settings screen via header button, overlaying current sidebar content.

#### Scenario: Opening Settings Screen
- **WHEN** user presses Settings button in header
- **THEN** Settings view is displayed, overlaying current sidebar content

### Requirement: Settings Screen Supports Back Navigation
Sidebar SHALL provide a back button from Settings screen to previous view.

#### Scenario: Pressing Back Button
- **WHEN** user presses "← back" in Settings screen
- **THEN** Settings screen closes and previous sidebar content is restored
