## MODIFIED Requirements

### Requirement: Openspec Data Polling
Sidebar SHALL periodically poll openspec directory and opencode command registry, updating interface.

#### Scenario: Periodic Polling
- **WHEN** sidebar is active and working directory is set
- **THEN** data reloads every 3 seconds via `setInterval`

#### Scenario: Directory Change
- **WHEN** value of `the displayed session's V2 location` changes
- **THEN** immediate data reload executes

#### Scenario: Checking Commands Availability
- **WHEN** during poll command list is requested via `api.client.command.list with explicit location`
- **THEN** flag `commandsReady` is set based on presence of command `opsx-propose`; on request error, flag retains previous value

#### Scenario: Load Error
- **WHEN** file system request ends with error
- **THEN** summary resets to `null`, and initialization state sets to `false`

### Requirement: Action Row In Overview
Sidebar SHALL show at the top a header line with text "OpenSpec", full-line version hover tooltip, Settings button on right, and an action row with Explore, Propose and Archive buttons. Execution guidance SHALL be shown in the editable command dialog rather than as persistent helper lines below the action row.

#### Scenario: Compact Action Row
- **WHEN** the overview displays its action buttons
- **THEN** it does not also repeat edit/run instructions or Plan/Build policy below them; the command dialog retains its agent/model details

#### Scenario: Explore And Propose
- **WHEN** user presses Explore or Propose
- **THEN** a native editable command dialog opens with `/opsx-explore ` or `/opsx-propose `; Enter runs it and Escape cancels without touching the main draft

#### Scenario: Archive Visible With Completed Changes
- **WHEN** number of completed Changes is greater than zero
- **THEN** action row displays Archive button in `success` color

#### Scenario: Launching Archive
- **WHEN** user presses Archive
- **THEN** command `/opsx-archive` is sent as agent turn (main draft preserved); with one completed Change its name is passed immediately, with multiple the command asks for selection

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
Sidebar SHALL lock action buttons that submit prompts while agent is busy, and indicate reason. Setup and update actions SHALL also hold this gate throughout asynchronous preparation and submission, before the host reports running. This submission lock SHALL NOT simulate an agent busy-to-idle transition.

#### Scenario: Button In Locked State
- **WHEN** agent is busy (V2 session status `running`)
- **THEN** action buttons display muted (color `textMuted`), and click shows toast "Wait until the agent finishes working" instead of executing

#### Scenario: Navigation Not Blocked
- **WHEN** agent is busy
- **THEN** navigation ("back" button, list rows, section collapse) remains available

## ADDED Requirements

### Requirement: V2 Semantic Theme
The sidebar SHALL use V2 theme colors and remain reactive to host theme changes. Its primary and secondary control colors SHALL use hue.interactive[200], and its accent color SHALL use hue.accent[200], rather than neutral action text colors. Feedback, text, background and border colors SHALL retain their semantic tokens. Disabled controls SHALL remain muted; themes that deliberately use neutral hue palettes SHALL be respected.

#### Scenario: Active Controls In A Migrated Theme
- **WHEN** the host theme provides colored interactive/accent hue palettes but neutral primary/secondary action text
- **THEN** active Init, Resume, Propose, Explore, update and navigation controls use their configured interactive/accent hue colors instead of neutral action text

#### Scenario: Disabled Control
- **WHEN** a colored action is disabled by the busy gate
- **THEN** its resting label uses textMuted and clicking cannot start the action

#### Scenario: Theme Switch
- **WHEN** the host switches its theme
- **THEN** sidebar content and controls adopt its new colors without remounting
