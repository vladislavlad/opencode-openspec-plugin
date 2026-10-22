## MODIFIED Requirements

### Requirement: Delete Confirmation Dialog
The system SHALL display an inline confirmation dialog with a warning and Delete/Cancel buttons before deleting a Change. The final Delete button SHALL use the current busy gate; Cancel SHALL remain available.

#### Scenario: Confirming Deletion
- **WHEN** the user presses "Delete" in the confirmation dialog while the session is idle
- **THEN** the delete handler is called by Change name, followed by return to the list

#### Scenario: Cancelling Deletion
- **WHEN** the user presses "Cancel" in the confirmation dialog, including while busy or retrying
- **THEN** the dialog closes and Apply/Update/Delete action buttons are displayed again

#### Scenario: Session Becomes Busy With Confirmation Open
- **WHEN** the session becomes busy or retrying after the confirmation dialog opens and the user presses "Delete"
- **THEN** the wait message is shown, the delete handler is not called, and the confirmation stays open

#### Scenario: Session Returns To Idle
- **WHEN** the session returns to idle with the confirmation still open and the user presses "Delete"
- **THEN** the delete handler is called by Change name, followed by return to the list
