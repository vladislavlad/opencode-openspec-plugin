## MODIFIED Requirements

### Requirement: Change action buttons
The system SHALL show a set of action buttons below the progress bar depending on the Change status: Apply, Update, and Delete for active; Archive and Update for completed. Commands are placed in the input without sending, except Archive which is sent immediately. All action buttons SHALL be blocked (disabled) when the agent is busy — state is managed through the `gate` prop.

#### Scenario: Active change actions
- **WHEN** the detailed card of an active (incomplete) Change is open
- **THEN** "Apply", "Update" and "Delete" buttons are displayed

#### Scenario: Apply button pressed
- **WHEN** the user presses the "Apply" button
- **THEN** the command `/opsx-apply <Change name>` is inserted into the input without sending

#### Scenario: Update button pressed
- **WHEN** the user presses the "Update" button
- **THEN** the command `/opsx-update <Change name>` is inserted into the input without sending

#### Scenario: Delete button pressed
- **WHEN** the user presses the "Delete" button
- **THEN** a deletion confirmation dialog appears instead of action buttons

#### Scenario: Buttons blocked during busy
- **WHEN** the agent is performing an operation (busy=true)
- **THEN** all action buttons Apply, Update and Delete are displayed in a disabled state with muted color (`textMuted`)

#### Scenario: Completed change actions
- **WHEN** the detailed card of a completed Change is open
- **THEN** "Archive" and "Update" buttons are displayed (without "Apply" and "Delete")

#### Scenario: Archive button pressed
- **WHEN** the user presses the "Archive" button
- **THEN** the command `/opsx-archive <Change name>` is sent immediately
