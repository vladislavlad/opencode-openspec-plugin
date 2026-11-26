## ADDED Requirements

### Requirement: Compatible plugin update channel
The sidebar SHALL offer only newer plugin releases in its supported major from its own npm package and designated channel.

#### Scenario: Both OpenCode lines are available
- **WHEN** the V2 sidebar checks for a plugin update
- **THEN** it reads the dedicated V2 package's `latest` tag

#### Scenario: The configured channel points to another major
- **WHEN** the registry returns a plugin version outside the supported major
- **THEN** the sidebar omits the plugin update

### Requirement: Refresh unstamped workflow skills
Settings SHALL offer a tooling refresh when the generated version is unavailable and the registry returns an OpenSpec CLI target. The update turn SHALL retain a CLI already at or above the target.

#### Scenario: OpenSpec 2.2 skills have no version stamp
- **WHEN** the user chooses Refresh OpenSpec
- **THEN** the update turn checks the actual CLI and previews the project tooling changes
