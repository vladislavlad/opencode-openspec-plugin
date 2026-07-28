## Purpose
Change Tracking displays a list of Changes with progress, a detailed Change card with action buttons and Task groups, and a delete confirmation dialog.

## Requirements

### Requirement: Displaying Change Row in List
The system SHALL display each Change row with name, status indicator (green for completed, yellow for active), and a progress bar with completed task counter.

#### Scenario: Active Change in List
- **WHEN** the Change has incomplete Tasks
- **THEN** the row displays a yellow dot (`warning`) before the name and a progress bar with the task counter enabled

#### Scenario: Completed Change in List
- **WHEN** all Tasks of the Change are completed
- **THEN** the row displays a green dot (`success`) before the name and a fully filled progress bar

### Requirement: Row Highlighting and Selection on Hover
The system SHALL highlight the Change row on cursor hover and handle click to navigate to the detail view.

#### Scenario: Cursor Hover on Row
- **WHEN** the user hovers over a Change row
- **THEN** the row background changes to a muted color, and progress bar text switches to the primary color

#### Scenario: Click on Row
- **WHEN** the user clicks on a Change row
- **THEN** the selection handler is called with the Change name to open the detail view

### Requirement: Detail Card Header and Back Button
The system SHALL display "Active Change" or "Completed Change" header depending on status, and a back button to return to the list, using the shared DetailHeader primitive so all detail screens have consistent spacing.

#### Scenario: Opening Active Change
- **WHEN** the detail card opens for an incomplete Change
- **THEN** the header shows "Active Change" in yellow, and a clickable "← back" button is displayed on the right

#### Scenario: Opening Completed Change
- **WHEN** the detail card opens for a completed Change
- **THEN** the header shows "Completed Change" in green

#### Scenario: Spacing Matches Other Detail Screens
- **WHEN** any Change detail card is open
- **THEN** there is exactly one empty line above the header, and no empty lines between the divider below the header and the Change name

### Requirement: Change Action Buttons
The system SHALL display a set of action buttons below the progress bar depending on Change status: Apply, Update, Delete for active; Archive and Update for completed. Commands are placed in the input without sending, except Archive which sends immediately. All action buttons SHALL be disabled when the agent is busy — state controlled via `gate` prop.

#### Scenario: Active Change Actions
- **WHEN** an active (incomplete) Change detail card is open
- **THEN** "Apply", "Update" and "Delete" buttons are displayed

#### Scenario: Apply Button Pressed
- **WHEN** the user presses "Apply"
- **THEN** the command `/opsx-apply <Change name>` is inserted into the input without sending

#### Scenario: Update Button Pressed
- **WHEN** the user presses "Update"
- **THEN** the command `/opsx-update <Change name>` is inserted into the input without sending

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

### Requirement: Delete Confirmation Dialog
The system SHALL display an inline confirmation dialog with a warning and Delete/Cancel buttons before deleting a Change.

#### Scenario: Confirming Deletion
- **WHEN** the user presses "Delete" in the confirmation dialog
- **THEN** the delete handler is called by Change name, followed by return to the list

#### Scenario: Cancelling Deletion
- **WHEN** the user presses "Cancel" in the confirmation dialog
- **THEN** the dialog closes and Apply/Update/Delete action buttons are displayed again

### Requirement: Rendering Task Groups
Task groups SHALL render with an optional header and a list of Tasks. Group header — on column zero; Tasks — in the marker column.

#### Scenario: Completed Task in Group
- **WHEN** a Task has status done=true
- **THEN** a green checkmark "✓" is displayed before the Task text, and the text is shown in muted color

#### Scenario: Incomplete Task in Group
- **WHEN** a Task has status done=false
- **THEN** two spaces are displayed before the Task text, and the text is shown in primary color

#### Scenario: Group Header
- **WHEN** a group has a header (group.title)
- **THEN** the header is displayed above Tasks without leading indent; if all Tasks in the group are completed — the header is shown in muted color, otherwise — in accent color

### Requirement: Proposal, Design and Tasks Sections in Change Card
The card SHALL consist of three collapsible sections: "Proposal", "Design", "Tasks". "Tasks" is open by default; "Proposal" and "Design" are collapsed. State resets on reopening.

#### Scenario: Section Order and Initial State
- **WHEN** the user opens a Change detail card
- **THEN** below action buttons are sections "Proposal", "Design" and "Tasks" in that exact order, "Tasks" content is visible, "Proposal" and "Design" content is hidden

#### Scenario: Expanding Section
- **WHEN** the user clicks on a collapsed section header
- **THEN** its content is displayed, and other sections' state remains unchanged

#### Scenario: Returning to Card
- **WHEN** the user leaves the card and opens it again
- **THEN** sections are shown in initial state: "Tasks" open, "Proposal" and "Design" collapsed

### Requirement: Proposal and Design Sections Content
"Proposal" SHALL display `proposal.md` sections in file order under their own headers; "Design" — the body of `design.md`. Section `## Capabilities` SHALL NOT be displayed. The set of sections SHALL not be hardcoded.

#### Scenario: Expanded Proposal Section
- **WHEN** the user expands the "Proposal" section for a Change whose `proposal.md` contains `## Why` and `## What Changes`
- **THEN** text from both sections is displayed, each under its own header, in file order

#### Scenario: Unknown Proposal Section
- **WHEN** `proposal.md` contains a section with any other name
- **THEN** it is displayed alongside others, under its own header

#### Scenario: Click on Teaser Expands Proposal
- **WHEN** the user clicks on the teaser of a collapsed "Proposal" section
- **THEN** the section expands, as when clicking the header

#### Scenario: `**` Characters Don't Leak Into UI
- **WHEN** artifact text contains inline markup `**text**`
- **THEN** "text" is displayed without `**` characters

#### Scenario: Capabilities Changes List Is Not Duplicated
- **WHEN** `proposal.md` contains section `## Capabilities`
- **THEN** its content is not displayed in the card

#### Scenario: Expanded Design Section
- **WHEN** the user expands "Design"
- **THEN** the full body of `design.md` is displayed, without length truncation

### Requirement: Proposal Teaser in Collapsed Section
Collapsed "Proposal" SHALL display a muted teaser — the beginning of `## Why`, or if absent — the beginning of the first section, truncated to two lines. If there's no text, the teaser is not displayed.

#### Scenario: Teaser Visible Without Expansion
- **WHEN** the Change card is open and "Proposal" section is collapsed
- **THEN** below its header the beginning of `## Why` is shown in `textMuted` color, with indent and ellipsis at truncation point

#### Scenario: Teaser Doesn't Grow With Proposal
- **WHEN** the `## Why` section contains several long paragraphs
- **THEN** only the beginning of the first paragraph appears in the teaser

#### Scenario: Proposal Without Why Section
- **WHEN** `proposal.md` has no `## Why` section
- **THEN** the teaser is taken from the first Proposal section

#### Scenario: Teaser Is Empty When Proposal Is Empty
- **WHEN** `proposal.md` has no sections with text
- **THEN** nothing is shown below the collapsed section header

### Requirement: Missing Change Artifacts
The "Design" section SHALL NOT be displayed when there's no `design.md`. The "Proposal" section SHALL remain in place and when `proposal.md` is absent SHALL display a muted message.

#### Scenario: Change Without design.md
- **WHEN** the Change directory has no `design.md` file
- **THEN** the card shows two sections — "Proposal" and "Tasks", and the "Design" header is not rendered

#### Scenario: Change Without proposal.md
- **WHEN** the Change directory has no `proposal.md` file
- **THEN** the "Proposal" section is displayed, and its expanded content is a muted message about missing file

#### Scenario: Artifacts Still Being Read
- **WHEN** the card is open but artifact reading is not complete
- **THEN** "Proposal" and "Tasks" sections are already in place, "Proposal" content is empty, and no missing-file message is shown

### Requirement: Task Counter in Section Header
The "Tasks" section SHALL show only label without counter. Progress is displayed via ProgressBar with `showNumberOfTasks` below the Change name.

#### Scenario: Tasks Header Without Counter
- **WHEN** a Change card is open with nine Tasks, five of which are completed
- **THEN** the section header shows "Tasks" without number, and progress with counter is visible in ProgressBar below the Change name

#### Scenario: Progress Remains in Header
- **WHEN** a Change card is open with Tasks
- **THEN** below the Change name a progress bar with `showNumberOfTasks` is displayed showing "N/M tasks done"
