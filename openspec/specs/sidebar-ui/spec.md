## Purpose
OpenSpec sidebar shell: single data poll, header, action row, three collapsible sections and navigation with detail views. Project configuration and updates live in their own capabilities (`init-flow`, `update-flow`) and receive data from this same poll.

## Requirements

### Requirement: Openspec Data Polling
Sidebar SHALL periodically poll openspec directory and opencode command registry, updating interface.

#### Scenario: Periodic Polling
- **WHEN** sidebar is active and working directory is set
- **THEN** data reloads every 3 seconds via `setInterval`

#### Scenario: Directory Change
- **WHEN** value of `props.api.state.path.directory` changes
- **THEN** immediate data reload executes

#### Scenario: Checking Commands Availability
- **WHEN** during poll command list is requested via `api.client.command.list`
- **THEN** flag `commandsReady` is set based on presence of command `opsx-propose`; on request error, flag retains previous value

#### Scenario: Load Error
- **WHEN** file system request ends with error
- **THEN** summary resets to `null`, and initialization state sets to `false`

### Requirement: Action Row In Overview
Sidebar SHALL show at the top a header line with text "OpenSpec", full-line version hover tooltip, Settings button on right, and an action row with Explore, Propose and Archive buttons.

#### Scenario: Explore And Propose
- **WHEN** user presses Explore or Propose
- **THEN** prompt is appended with `/opsx-explore ` or `/opsx-propose ` without submission, cursor ready for description input

#### Scenario: Archive Visible With Completed Changes
- **WHEN** number of completed Changes is greater than zero
- **THEN** action row displays Archive button in `success` color

#### Scenario: Launching Archive
- **WHEN** user presses Archive
- **THEN** command `/opsx-archive` is sent as agent turn (input cleared before submit); with one completed Change its name is passed immediately, with multiple the command asks for selection

#### Scenario: Version Hover On Header Line
- **WHEN** cursor is over any part of sidebar header line
- **THEN** plugin version (e.g., `0.2.0`, color `textMuted`) displays next to "OpenSpec" text

#### Scenario: Version Hidden On Cursor Leave
- **WHEN** cursor leaves header line
- **THEN** version hides, Settings button returns to `textMuted` color

#### Scenario: Settings Button At Rest
- **WHEN** sidebar shows overview or any detail view and cursor is not on header line
- **THEN** right side of header displays Settings button in `textMuted` color

#### Scenario: Settings Button On Line Hover
- **WHEN** cursor is over header line
- **THEN** Settings button changes color to `accent`

#### Scenario: Update Available — Persistent Accent For Settings Button
- **WHEN** `pluginUpdate` or `cliUpdate` are not `null`
- **THEN** Settings button displays in `accent` color regardless of hover

#### Scenario: Pressing Settings Button
- **WHEN** user presses Settings button
- **THEN** Settings screen opens, overlaying current content

### Requirement: Action Lock During Agent Work
Sidebar SHALL lock action buttons that submit prompts while agent is busy, and indicate reason.

#### Scenario: Button In Locked State
- **WHEN** agent is busy (session status `busy` or `retry`)
- **THEN** action buttons display muted (color `textMuted`), and click shows toast "Wait until the agent finishes working" instead of executing

#### Scenario: Navigation Not Blocked
- **WHEN** agent is busy
- **THEN** navigation ("back" button, list rows, section collapse) remains available

### Requirement: Tasks Progress Under Active Changes
Sidebar SHALL show aggregated Tasks progress for active Changes under collapsed "Active Changes" section header.

#### Scenario: Summary When Section Collapsed
- **WHEN** "Active Changes" section is collapsed and there are more than zero active Changes
- **THEN** `X/Y tasks done` (color `textMuted`) and progress bar, aggregated across active Changes, display under header

#### Scenario: Hidden On Expand
- **WHEN** "Active Changes" section is expanded
- **THEN** summary doesn't show — Change rows are visible instead

#### Scenario: No Active Changes
- **WHEN** there are no active Changes
- **THEN** summary doesn't show

### Requirement: Active Changes Section
Sidebar SHALL display collapsible "Active Changes" section with all unfinished Changes.

#### Scenario: Displaying Active Changes
- **WHEN** summary contains Changes for which `isComplete()` returns `false`
- **THEN** "Active Changes" section displays `ChangeRow` rows with item count in header

#### Scenario: Auto-open On Items Appear
- **WHEN** active Changes appear for the first time after load
- **THEN** section auto-expands once

#### Scenario: Collapse And Expand
- **WHEN** user presses on section header
- **THEN** section toggles between collapsed and expanded states

### Requirement: Completed Changes Section
Sidebar SHALL display collapsible "Completed Changes" section with all completed Changes, expanding it once when completed Changes appear for the first time.

#### Scenario: Displaying Completed Changes
- **WHEN** summary contains Changes for which `isComplete()` returns `true`
- **THEN** "Completed Changes" section displays `ChangeRow` rows with item count in header

#### Scenario: Auto-open On Items Appear
- **WHEN** completed Changes appear for the first time after load
- **THEN** section auto-expands once, further state is determined by user

### Requirement: Specifications Section
Sidebar SHALL display collapsible "Specifications" section with search field above list and specifications from summary, filtered by query.

#### Scenario: Displaying Specifications
- **WHEN** summary contains specification list and search query is empty
- **THEN** "Specifications" section displays search field, then `SpecRow` rows below it, with total item count in header

#### Scenario: Auto-open On Items Appear
- **WHEN** specifications appear for the first time after load
- **THEN** section auto-expands once

#### Scenario: Search Field Above List
- **WHEN** "Specifications" section is expanded
- **THEN** first element of section, before all specification rows, displays search field — its behavior is described in `spec-search`

#### Scenario: Filtering List By Query
- **WHEN** user entered query in search field
- **THEN** list shows only specifications matching query, and counter in section header reflects number found

#### Scenario: Empty Result
- **WHEN** query is not empty and no specification matches it
- **THEN** muted text "No matches" displays instead of list

#### Scenario: Query Reset
- **WHEN** query is cleared
- **THEN** list shows all specifications again, counter — their total count

### Requirement: Navigation With Detail Views
Sidebar SHALL support detailed navigation through Changes, specifications and requirements with mutually exclusive selection state.

#### Scenario: Opening Change Details
- **WHEN** user selects a row from Changes list
- **THEN** `ChangeDetail` displays, and spec and requirement selections reset

#### Scenario: Opening Specification Details
- **WHEN** user selects a row from specifications list
- **THEN** `SpecDetail` displays, and change and requirement selections reset

#### Scenario: Opening Requirement Details
- **WHEN** user selects a requirement within specification
- **THEN** `RequirementDetail` displays over `SpecDetail`

#### Scenario: "Back" Button
- **WHEN** user presses back button in any detail view
- **THEN** navigation returns to previous level, and hover state resets

### Requirement: Reading Open Change Artifacts
Sidebar SHALL read `proposal.md` and `design.md` of a Change once — when it's opened — and SHALL NOT include this reading in periodic poll. Sidebar SHALL first get the Change directory file list and only read existing files. Read error SHALL be treated as artifact absence and SHALL NOT reset summary. Read content SHALL be passed to `ChangeDetail` via prop.

#### Scenario: Opening Change
- **WHEN** user selects a Change from list
- **THEN** Change directory is read once, and its artifacts are passed to `ChangeDetail`

#### Scenario: Poll Doesn't Grow Expensive
- **WHEN** next three-second poll tick fires
- **THEN** `proposal.md` and `design.md` are not read — poll still only reads `tasks.md`, specifications, `config.yaml` and command list

#### Scenario: Changing Selected Change
- **WHEN** user returns to list and opens a different Change
- **THEN** previously read artifacts reset, new ones re-read

#### Scenario: Artifact Unavailable
- **WHEN** artifact file read ends with error
- **THEN** artifact is considered absent, summary preserved, initialization state unchanged

### Requirement: Reload button label consistency
Every reload button in the sidebar SHALL use the label "Reload OpenCode" to clearly indicate that opencode will be reopened.

#### Scenario: Settings reload button uses correct label
- **WHEN** user opens the Settings view and sees the reload prompt
- **THEN** the reload button displays "Reload OpenCode" matching the init-flow banner
