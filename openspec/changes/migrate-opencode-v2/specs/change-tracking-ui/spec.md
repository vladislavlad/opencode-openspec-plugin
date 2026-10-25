## MODIFIED Requirements

### Requirement: Change Action Buttons
The system SHALL display a set of action buttons below the progress bar depending on Change status: Apply, Update, Delete for active; Archive and Update for completed. Apply and Update open editable native command dialogs; Archive sends immediately. All action buttons SHALL be disabled when the agent is busy — state controlled via `gate` prop.

#### Scenario: Active Change Actions
- **WHEN** an active (incomplete) Change detail card is open
- **THEN** "Apply", "Update" and "Delete" buttons are displayed

#### Scenario: Apply Button Pressed
- **WHEN** the user presses "Apply"
- **THEN** the command `/opsx-apply <Change name>` opens in an editable native dialog; Enter runs it and Escape cancels

#### Scenario: Update Button Pressed
- **WHEN** the user presses "Update"
- **THEN** the command `/opsx-update <Change name>` opens in an editable native dialog; Enter runs it and Escape cancels

#### Scenario: Delete Button Pressed
- **WHEN** the user presses "Delete"
- **THEN** a delete confirmation dialog appears instead of action buttons

#### Scenario: Buttons Locked During Busy
- **WHEN** the agent is performing an operation (busy=true)
- **THEN** all action buttons Apply, Update and Delete are displayed in disabled state with muted color (`textMuted`)

#### Scenario: Completed Change Actions
- **WHEN** a completed Change detail card is open
- **THEN** "Archive" and "Update" buttons are displayed (without "Apply" and "Delete")

#### Scenario: Archive Button Pressed
- **WHEN** the user presses "Archive"
- **THEN** the command `/opsx-archive <Change name>` is sent immediately
