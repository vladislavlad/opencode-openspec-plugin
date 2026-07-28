## Purpose
This capability handles plugin registration in OpenCode system, sidebar widget injection via TUI slots, and file system access: change deletion and managing the `plugin:` block in config.yaml — reading and writing in one place, with fallback to agent when files are inaccessible.

## Requirements

### Requirement: Plugin Module Export
The system SHALL export a default object satisfying type `TuiPluginModule`, containing field `id` with value `"openspec-tui"` and async function `tui`.

#### Scenario: Standard Export
- **WHEN** module `src/index.tsx` is imported as default export
- **THEN** result contains property `id` equal to `"openspec-tui"` and callable property `tui`

### Requirement: TUI Sidebar Slot Registration
The system SHALL register slot `sidebar_content` with order number 600 via `api.slots.register`.

#### Scenario: Calling tui Function
- **WHEN** function `tui` is called with API object
- **THEN** method `api.slots.register` is called once with parameter `{ order: 600, slots: { sidebar_content } }`

#### Scenario: Slot Returns Sidebar Component
- **WHEN** registered slot `sidebar_content` is called with slot context
- **THEN** JSX component `<OpenSpecSidebar>` with props `api`, `sessionId` (from `value.session_id`) and `baselineAvailable` is returned

### Requirement: Command Registration
The system SHALL call function `registerCommands(api)` during plugin initialization to register CLI commands.

#### Scenario: Plugin Initialization
- **WHEN** function `tui` is called with API object
- **THEN** function `registerCommands` is called with passed `api`, and return value is used as prop `baselineAvailable` for sidebar

### Requirement: File System Write Only When Files Are Accessible
The opencode API doesn't provide file writes, so writing goes directly through `node:fs`. This works only while TUI and project live on the same machine: `api.state.path.directory` — a string received from server, against remote server it points to someone else's disk. The system SHALL check working directory accessibility before any write and SHALL return failure indicator instead of throwing exception so caller can hand work to agent.

#### Scenario: Working Directory Accessible
- **WHEN** root for write is requested and `api.state.path.directory` points to existing directory on this machine
- **THEN** path to it is returned

#### Scenario: Working Directory Inaccessible
- **WHEN** `api.state.path.directory` is empty or doesn't exist on this machine
- **THEN** `null` is returned, write not performed

#### Scenario: Write Error Not Thrown
- **WHEN** read, write or delete ends with error
- **THEN** operation returns `null` or `false`, and exception doesn't propagate out

### Requirement: Change Deletion Via File System
The system SHALL recursively delete Change folder `openspec/changes/{name}`, treating path absence as success.

#### Scenario: Successful Deletion
- **WHEN** function `deleteChange` is called with accessible working directory
- **THEN** folder is deleted recursively, and its absence is not considered an error

#### Scenario: Change Row Disappears On Its Own
- **WHEN** Change folder is deleted
- **THEN** next poll stops seeing the Change, and row disappears from list without separate sidebar update

### Requirement: Deletion Fallback To Agent
The system SHALL pass deletion request to agent via `sendPrompt` if working directory is inaccessible or deletion didn't execute.

#### Scenario: Files Inaccessible
- **WHEN** working directory is undefined or doesn't exist on this machine
- **THEN** function `sendPrompt` is called with `api` and string `"delete openspec change {name}"`

#### Scenario: Deletion Failed
- **WHEN** folder deletion ended with error (no permissions, file in use)
- **THEN** function `sendPrompt` is called with `api` and string `"delete openspec change {name}"` — error is not swallowed silently

### Requirement: Reading Plugin Block From config.yaml
The system SHALL read `openspec/config.yaml` and return both service markers in one read: incomplete-setup indicator `plugin.init.in-progress` with completed stages list `plugin.init.done`, and update flag `plugin.update-in-progress` with versions `old`/`new`.

#### Scenario: Both Markers In One Read
- **WHEN** sidebar polls state
- **THEN** config.yaml is read once, not separately for each marker — polling repeats every few seconds

#### Scenario: Update Flag Present
- **WHEN** `plugin.update-in-progress` exists in config.yaml with at least one of fields `old`/`new`
- **THEN** version range is returned, missing field gives empty string

#### Scenario: Update Flag Absent
- **WHEN** block `plugin.update-in-progress` doesn't exist
- **THEN** `null` is returned

#### Scenario: Markers Coexist
- **WHEN** both `init` and `update-in-progress` are present in `plugin:` block
- **THEN** both are returned, neither overwrites the other

#### Scenario: Marker Set Before Installation
- **WHEN** config.yaml contains `plugin.init.in-progress` with value true and empty `done` list
- **THEN** incomplete-setup indicator is returned with empty completed stages list

#### Scenario: Stages Checkpointed
- **WHEN** stages are listed in `plugin.init.done`
- **THEN** they are returned in file order

#### Scenario: Marker Removed
- **WHEN** config.yaml has no `plugin.init` block
- **THEN** incomplete-setup indicator equals false, completed stages list is empty

#### Scenario: Unknown Stage Values
- **WHEN** `plugin.init.done` contains values outside set `tooling`, `config`, `specs` or isn't a list
- **THEN** unknown values are dropped, and non-list gives empty list

#### Scenario: Configuration Inaccessible Or Corrupted
- **WHEN** config.yaml is absent or doesn't parse as YAML
- **THEN** indicator equals false, list is empty, error not thrown

### Requirement: Sidebar Writes Only Init Marker
From service block `plugin:` the sidebar SHALL write only `plugin.init.in-progress`. Stage checkpoints `plugin.init.done` and flag `plugin.update-in-progress` remain with agent — only it knows whether a stage actually completed. When writing marker, system SHALL create directory and file if they don't exist (with `schema: spec-driven`), preserve all other content (`context`, `rules`, comments, `update-in-progress`), and remove empty `plugin:` block on marker removal.

#### Scenario: File Or Directory Doesn't Exist Yet
- **WHEN** marker is set but `openspec/config.yaml` is absent
- **THEN** directory and file are created, file receives `schema: spec-driven` along with marker

#### Scenario: Remaining Content Survives Edit
- **WHEN** marker is set or removed in file with `context`, `rules`, comments and flag `plugin.update-in-progress`
- **THEN** all this is preserved unchanged — only block `plugin.init` is edited

### Requirement: Refusal To Write To Corrupted config.yaml
Editing config.yaml SHALL go through YAML parsing and reverse serialization, not text assembly. If file doesn't parse, system SHALL refuse to write.

#### Scenario: Corrupted YAML
- **WHEN** config.yaml doesn't parse
- **THEN** write is not performed, file remains byte-for-byte unchanged, work handed to agent

#### Scenario: Edit Goes Through Document, Not Text
- **WHEN** a field needs changing in config.yaml
- **THEN** file is read, parsed, needed node edited and serialized back — remaining content and comments are preserved by parser itself
