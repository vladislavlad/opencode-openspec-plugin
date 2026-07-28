## ADDED Requirements

### Requirement: Check Versions and Reload buttons are blocked while the agent is working
The Check Versions button SHALL be locked when the agent is busy. Pressing a locked button SHALL not trigger an update check and SHALL show a toast "Wait until the agent finishes working". The Reload button SHALL be locked when the agent is busy. Pressing a locked button SHALL not close opencode and SHALL show the same toast.

#### Scenario: Check Versions blocked
- **WHEN** the agent is busy and the user presses Check Versions in Settings
- **THEN** the update check does not start, a toast "Wait until the agent finishes working" is shown

#### Scenario: Reload blocked
- **WHEN** the agent is busy and the user presses Reload in Settings
- **THEN** opencode does not close, a toast "Wait until the agent finishes working" is shown

#### Scenario: Buttons unlocked when idle
- **WHEN** the agent is free
- **THEN** both buttons are active and perform their respective actions on press
