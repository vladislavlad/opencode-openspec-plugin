## MODIFIED Requirements

### Requirement: Plugin Module Export
The system SHALL default-export a V2 Plugin.define definition with id "openspec-tui" and setup(context), using @opencode/plugin/tui.

#### Scenario: Standard Export
- **WHEN** OpenCode V2 imports the package's ./tui export
- **THEN** it receives the stable ID and callable setup function


### Requirement: Command Registration
The system SHALL register its own commands during V2 setup; the host SHALL own command-layer cleanup.

#### Scenario: Plugin Initialization
- **WHEN** setup runs
- **THEN** registerCommands returns baseline availability for the sidebar

### Requirement: File System Write Only When Files Are Accessible
The system SHALL resolve the current session's V2 location, falling back to the context/default location without a session. Local writes SHALL check directory accessibility and return failure for agent fallback when unavailable.

#### Scenario: Working Directory Accessible
- **WHEN** the resolved directory exists locally
- **THEN** localRoot returns that directory

#### Scenario: Working Directory Inaccessible
- **WHEN** the resolved directory is unavailable locally
- **THEN** localRoot returns null and callers use the existing agent fallback

#### Scenario: Write Error Not Thrown
- **WHEN** a local operation fails
- **THEN** it returns null or false without propagating the filesystem exception

## ADDED Requirements

### Requirement: V2 Scoped File Reads
The plugin SHALL pass the session location to V2 project file, command catalog and configuration reads and decode file.read bytes as UTF-8. Project command templates SHALL retain the project read scope; external configuration sources SHALL use their server configuration directory. Template reads SHALL NOT use the TUI machine's filesystem.

#### Scenario: Two Session Locations
- **WHEN** a sidebar displays a session in another project
- **THEN** reads use that session's directory, not the startup default

## REMOVED Requirements

### Requirement: TUI Sidebar Slot Registration
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use V2 Sidebar Slot Registration in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: V2 Sidebar Slot Registration
The system SHALL append a contribution to sidebar.content through context.ui.slot and release it on cleanup.

#### Scenario: Calling setup
- **WHEN** the plugin loads
- **THEN** sidebar.content is registered with a renderer receiving sessionID

#### Scenario: Slot Returns Sidebar Component
- **WHEN** the slot renders
- **THEN** OpenSpecSidebar receives the V2 context, slot sessionID and baseline availability

#### Scenario: Session Or Location Changes
- **WHEN** the slot session or its directory changes
- **THEN** the old sidebar is disposed and a fresh one starts without old selections or timers


### Requirement: Local V2 Package Entry
The repository SHALL provide a physical tui.js entrypoint forwarding to the built plugin; published packages SHALL expose ./tui. The installation guide SHALL retain a separate V1 guide and distinguish global V2 CLI configuration from V1 configuration.

#### Scenario: Local Development Load
- **WHEN** the user builds the repository and adds its directory to global cli.json plugins
- **THEN** the V2 host resolves tui.js and loads the same built plugin as the published ./tui export

#### Scenario: V1 Installation Reference
- **WHEN** a user needs the previous major
- **THEN** README links to docs/v1.md with the pinned 1.0.0 install, V1 compatibility and usage instructions
