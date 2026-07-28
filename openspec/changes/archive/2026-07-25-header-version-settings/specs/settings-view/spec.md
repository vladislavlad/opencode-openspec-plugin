## ADDED Requirements

### Requirement: Settings screen displays plugin version
The sidebar SHALL display a Settings screen with the plugin version when activated. The screen header is `warn` color, without a divider below it (spacing instead of divider). Version is displayed on one line: "Plugin version" on the left, version value on the right.

#### Scenario: Open Settings screen
- **WHEN** the user clicks the Settings button in the header
- **THEN** the Settings view is displayed, overlaying current sidebar content

#### Scenario: Display version
- **WHEN** the Settings screen is open
- **THEN** a "Plugin version" line is shown on the left and the version value (e.g., `0.2.0`) on the right on the same line

### Requirement: Settings screen supports back navigation
The sidebar SHALL provide a back button from the Settings screen to the previous view.

#### Scenario: Click back button
- **WHEN** the user clicks "← back" in the Settings screen
- **THEN** the Settings screen closes and previous sidebar content is restored
