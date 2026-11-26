## ADDED Requirements

### Requirement: Required upgrade notice in OpenCode 2
The V1 plugin SHALL show a dialog with the minimum V2 plugin version and the cli.json replacement when OpenCode 2 loads its TUI entrypoint. The plugin SHALL withhold the legacy sidebar and its workflow commands on that host.

#### Scenario: OpenCode migrates the global V1 plugin entry
- **WHEN** OpenCode 2.4.1 loads the migrated V1 maintenance package
- **THEN** the dialog says that plugin 2.0.0 or a later 2.x is required
- **AND** it names the dedicated V2 npm package and shows how to replace the entry while keeping its options

### Requirement: Host-provided runtime dependencies
The published TUI package SHALL let OpenCode provide its SDK and renderer at runtime.

#### Scenario: OpenCode installs the plugin in a clean profile
- **WHEN** a compatible OpenCode host installs the npm package for the first time
- **THEN** the package installs and loads using the host runtime
