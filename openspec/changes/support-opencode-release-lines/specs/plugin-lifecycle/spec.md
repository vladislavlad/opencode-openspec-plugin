## ADDED Requirements

### Requirement: OpenCode 2 runtime compatibility
The V2 plugin SHALL expose a TUI entrypoint for OpenCode 2.4.1. It SHALL show a host upgrade notice and withhold commands and sidebar registration on an older OpenCode 2 host that loads it.

#### Scenario: An older V2 host loads the package
- **WHEN** the running OpenCode version is earlier than 2.4.1
- **THEN** the plugin shows the minimum host version and registers no workflow UI

### Requirement: Resume an update after migrating from V1
The V2 plugin SHALL recognize an existing V1 update flag as a pending migration into the running V2 plugin.

#### Scenario: The host changes before a V1 update finishes
- **WHEN** V2 reads an update flag whose target belongs to the older plugin line
- **THEN** Complete Update uses the running V2 version as the migration destination
