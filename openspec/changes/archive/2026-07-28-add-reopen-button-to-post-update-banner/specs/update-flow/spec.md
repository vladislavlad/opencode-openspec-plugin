## MODIFIED Requirements

### Requirement: Post-update banner in sidebar
The sidebar SHALL show a "Run checks after update" banner above an action row when there is a pending migration range. The range is taken from two sources: the `plugin.update-in-progress` flag in config.yaml and the version increase stored in `kv`. The flag takes priority — it is the only source that knows the exact version we left from.

#### Scenario: Show banner after reload
- **WHEN** the plugin loads, `updateFlag` contains `{ old, new }` and `flag.new === VERSION`
- **THEN** a banner is displayed with a message about needing to complete the update and a Complete Update button (`accent`)

#### Scenario: New version didn't pick up
- **WHEN** `updateFlag` contains `{ old, new }`, but `flag.new !== VERSION`
- **THEN** a message "Reopen opencode to finish updating..." is shown with a Reopen OpenCode button (`error`) that closes opencode; no migrations are started

#### Scenario: Update happened outside the Update button
- **WHEN** there is no flag in config.yaml, the version stored in `kv` is lower than the loaded one, and there is at least one `MIGRATIONS` entry for the range
- **THEN** the same banner with a Complete Update button is displayed for the range from the stored version to the loaded one

#### Scenario: Nothing to show in the range
- **WHEN** the stored version is lower than the loaded one, but there are no `MIGRATIONS` entries in the range
- **THEN** the banner is not shown, and the version is silently recorded in `kv`

#### Scenario: Nothing to show from the start
- **WHEN** there is no stored version, or it matches the loaded one, or it is higher than the loaded one
- **THEN** the banner is not shown, and the version is silently recorded in `kv`

#### Scenario: Both sources indicate an update
- **WHEN** both the `plugin.update-in-progress` flag and a version drift in `kv` are present
- **THEN** the range from the flag is used, the banner is shown once

#### Scenario: Complete Update pressed
- **WHEN** the user presses Complete Update while the agent is idle
- **THEN** the plugin forms a prompt from migration instructions for the pending range and sends it directly to the agent; buttons are locked until the agent's turn completes

#### Scenario: Prompt for a kv-derived range doesn't clear the flag
- **WHEN** the pending range was obtained from `kv`, not from the flag
- **THEN** the prompt does not contain a requirement to remove `plugin.update-in-progress` from config.yaml — there is nothing to clear

#### Scenario: Complete Update blocked while agent is busy
- **WHEN** the agent is busy and the user presses Complete Update
- **THEN** no prompt is sent, a toast "Wait until the agent finishes working" is shown

#### Scenario: Successful migration completion
- **WHEN** the agent completed its turn after Complete Update
- **THEN** the sidebar records `VERSION` in `kv`, and the banner from this source no longer appears

#### Scenario: Flag cleared by agent
- **WHEN** the agent completed its turn after Complete Update and removed `plugin.update-in-progress` from config.yaml
- **THEN** `updateFlag` becomes `null`, the banner is hidden
