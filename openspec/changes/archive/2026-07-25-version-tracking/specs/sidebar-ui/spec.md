## ADDED Requirements

### Requirement: Update warning banner in sidebar
The panel SHALL display a banner above the action row (Explore/Propose) if a plugin or CLI update is available.

#### Scenario: Show banner when updates are available
- **WHEN** `pluginUpdate` or `cliUpdate` are not `null` and banner is not dismissed
- **THEN** a line with text in `textMuted` about available updates, Dismiss button (`warn`) and Settings button (`accent`) is displayed

#### Scenario: Hide banner on Dismiss
- **WHEN** the user clicks Dismiss
- **THEN** banner is hidden until next data reload or Check Versions click in Settings

#### Scenario: Click Settings in banner
- **WHEN** the user clicks Settings in the banner
- **THEN** Settings screen opens, banner remains hidden

#### Scenario: Banner not shown when no updates
- **WHEN** no updates available or check failed
- **THEN** banner is not displayed, action row is visible immediately

### Requirement: Settings button in header changes to `accent` on hover
The Settings button in the header row SHALL change color from `textMuted` to `accent` on cursor hover. If an update is available, the button displays in `accent` color permanently.

#### Scenario: Hover over header row
- **WHEN** cursor is over the sidebar header row
- **THEN** Settings button changes to `accent` color

#### Scenario: Cursor leaves without updates
- **WHEN** cursor moves away from header row and no updates are available
- **THEN** Settings button returns to `textMuted` color

#### Scenario: Update available – permanent accent
- **WHEN** `pluginUpdate` or `cliUpdate` are not `null`
- **THEN** Settings button displays in `accent` color regardless of hover

### Requirement: Post-update banner in sidebar
The panel SHALL display a "Run checks after update" banner above the action row if the `plugin.update-in-progress` flag is found in config.yaml and the new version matches the loaded one.

#### Scenario: Show banner after reload
- **WHEN** plugin loads, `updateFlag` contains `{ old, new }` and `flag.new === VERSION`
- **THEN** a banner with text about needing to complete the update and Complete Update button (`accent`) is displayed

#### Scenario: New version not picked up
- **WHEN** `updateFlag` contains `{ old, new }`, but `flag.new !== VERSION`
- **THEN** instead of Complete Update button, a soft hint "reopen opencode to finish update" is shown; migrations are not triggered

#### Scenario: Click Complete Update
- **WHEN** the user clicks Complete Update while agent is idle
- **THEN** plugin forms a prompt from migration instructions for range `(old, new]` and sends it directly to agent; buttons remain locked until agent turn completes

#### Scenario: Complete Update blocked while agent is working
- **WHEN** agent is busy and user clicks Complete Update
- **THEN** prompt is not sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Migration completed successfully
- **WHEN** agent completes turn after Complete Update and clears `plugin.update-in-progress` from config.yaml
- **THEN** `updateFlag` becomes `null`, banner hidden
