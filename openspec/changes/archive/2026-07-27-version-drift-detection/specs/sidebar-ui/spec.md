## MODIFIED Requirements

### Requirement: Post-update banner in sidebar
The sidebar SHALL show a "Run checks after update" banner above the action row when there is a pending migration range. The range comes from two sources: the `plugin.update-in-progress` flag in config.yaml and version growth saved in `kv`. Flag takes priority – it alone knows the exact version you left from.

#### Scenario: Banner display after reload
- **WHEN** plugin loads, `updateFlag` contains `{ old, new }` and `flag.new === VERSION`
- **THEN** a banner is displayed with text about needing to complete the update and a Complete Update button (`accent`)

#### Scenario: New version didn't pick up
- **WHEN** `updateFlag` contains `{ old, new }`, but `flag.new !== VERSION`
- **THEN** instead of the Complete Update button, a soft hint "reopen opencode to finish update" is shown, migrations don't launch

#### Scenario: Update happened past the Update button
- **WHEN** no flag in config.yaml, saved version in `kv` is lower than loaded, and there's at least one `MIGRATIONS` entry for the range
- **THEN** the same banner with Complete Update button is displayed for the range from saved version to loaded

#### Scenario: Nothing to show in range
- **WHEN** saved version is lower than loaded, but no `MIGRATIONS` entries exist in range
- **THEN** banner isn't shown and version is silently recorded in `kv`

#### Scenario: Nothing to show from the start
- **WHEN** no saved version exists, or it matches loaded, or is higher
- **THEN** banner isn't shown and version is silently recorded in `kv`

#### Scenario: Both sources indicate an update
- **WHEN** both flag `plugin.update-in-progress` and version drift in `kv` exist
- **THEN** range from the flag is used, banner shows once

#### Scenario: Complete Update press
- **WHEN** user presses Complete Update while agent is idle
- **THEN** plugin forms a prompt from migration instructions for the pending range and sends it directly to the agent; buttons are locked until agent turn completion

#### Scenario: Prompt for kv range doesn't remove flag
- **WHEN** pending range came from `kv` rather than from flag
- **THEN** prompt doesn't contain a requirement to delete `plugin.update-in-progress` from config.yaml – there's nothing to remove

#### Scenario: Complete Update blocked during agent work
- **WHEN** agent is busy and user presses Complete Update
- **THEN** prompt isn't sent, toast "Wait until the agent finishes working" is shown

#### Scenario: Successful migration completion
- **WHEN** agent completed turn after Complete Update
- **THEN** sidebar records `VERSION` in `kv`, and banner from this source no longer appears

#### Scenario: Flag removed by agent
- **WHEN** agent completed turn after Complete Update and removed `plugin.update-in-progress` from config.yaml
- **THEN** `updateFlag` becomes `null`, banner hides
