## ADDED Requirements

### Requirement: Proposal, Design and Tasks sections in the change card
The card SHALL consist of three collapsible sections: "Proposal", "Design", "Tasks". "Tasks" is expanded by default; "Proposal" and "Design" are collapsed. State resets on re-open.

#### Scenario: Section order and initial state
- **WHEN** user opens a detailed change card
- **THEN** below the action buttons come sections "Proposal", "Design", and "Tasks" in exactly this order, contents of "Tasks" are visible, contents of "Proposal" and "Design" are hidden

#### Scenario: Expanding a section
- **WHEN** user clicks on the heading of a collapsed section
- **THEN** its content is displayed, and the state of other sections does not change

#### Scenario: Returning to card
- **WHEN** user leaves the card and opens it again
- **THEN** sections are shown in their initial state: "Tasks" expanded, "Proposal" and "Design" collapsed

### Requirement: Contents of Proposal and Design sections
"Proposal" SHALL show sections of `proposal.md` in file order under their own headings; "Design" – the body of `design.md`. Section `## Capabilities` SHALL not be displayed. The set of sections SHALL not be hardcoded.

#### Scenario: Expanded Proposal section
- **WHEN** user expands the "Proposal" section for a change whose `proposal.md` contains `## Why` and `## What Changes`
- **THEN** text from both sections is displayed, each under its own heading, in file order

#### Scenario: Unknown proposal section
- **WHEN** `proposal.md` contains a section with any other name
- **THEN** it is displayed alongside the others, under its own heading

#### Scenario: Click on teaser expands Proposal
- **WHEN** user clicks on the teaser of the collapsed "Proposal" section
- **THEN** the section expands, as when clicking the heading

#### Scenario: `**` characters do not leak into UI
- **WHEN** artifact text contains inline markup `**text**`
- **THEN** "text" is displayed without `**` characters

#### Scenario: Capability change list is not duplicated
- **WHEN** `proposal.md` contains section `## Capabilities`
- **THEN** its content is not displayed in the card

#### Scenario: Expanded Design section
- **WHEN** user expands the "Design" section
- **THEN** the body of `design.md` is displayed entirely, without length truncation

### Requirement: Proposal teaser in collapsed section
Collapsed "Proposal" SHALL show a muted teaser – the beginning of `## Why`, and when absent – the beginning of the first section, truncated to two lines. If there is no text, the teaser is not displayed.

#### Scenario: Teaser visible without expanding
- **WHEN** change card is open and "Proposal" section is collapsed
- **THEN** below its heading the beginning of `## Why` is shown in `textMuted` color, with indentation and ellipsis at the truncation point

#### Scenario: Teaser does not grow with proposal
- **WHEN** section `## Why` contains several long paragraphs
- **THEN** only the beginning of the first paragraph enters the teaser

#### Scenario: Proposal without Why section
- **WHEN** `proposal.md` has no `## Why` section
- **THEN** the teaser is taken from the first proposal section

#### Scenario: Teaser is empty when proposal is empty
- **WHEN** `proposal.md` has no sections with text
- **THEN** nothing is shown below the collapsed section heading

### Requirement: Missing change artifacts
Section "Design" SHALL not be displayed when there is no `design.md`. Section "Proposal" SHALL remain in place and when `proposal.md` is absent SHALL show a muted message.

#### Scenario: Change without design.md
- **WHEN** the change directory has no file `design.md`
- **THEN** the card shows two sections – "Proposal" and "Tasks", – and the "Design" heading is not rendered

#### Scenario: Change without proposal.md
- **WHEN** the change directory has no file `proposal.md`
- **THEN** section "Proposal" is displayed, and its expanded content is a muted message about missing file

#### Scenario: Artifacts are still being read
- **WHEN** card is open but artifact reading is not complete
- **THEN** sections "Proposal" and "Tasks" are already in place, contents of "Proposal" are empty, and the missing-file message is not shown

### Requirement: Task counter in section header
Task count SHALL be displayed in the "Tasks" heading in `done/total` format and SHALL not be duplicated on a separate line. Progress bar remains in place.

#### Scenario: Number of tasks in heading
- **WHEN** change card is open with nine tasks, five of which are completed
- **THEN** section heading shows "Tasks: 5/9", and there is no separate line with task count below the change name

#### Scenario: Progress remains in header
- **WHEN** change card is open with tasks
- **THEN** a progress bar is displayed below the change name, as before

## MODIFIED Requirements

### Requirement: Rendering task groups
Task groups SHALL render with an optional heading and a list of tasks. Group heading – on column zero; tasks – in marker column.

#### Scenario: Completed task in group
- **WHEN** task has status done=true
- **THEN** a green checkmark "✓" is displayed before the task text, and the task text is shown in muted color

#### Scenario: Incomplete task in group
- **WHEN** task has status done=false
- **THEN** two spaces are displayed before the task text, and the task text is shown in primary color

#### Scenario: Group heading
- **WHEN** group has a heading (group.title)
- **THEN** the heading is displayed above tasks without leading indentation; if all tasks in the group are completed – the heading is shown in muted color, otherwise – in accent color
