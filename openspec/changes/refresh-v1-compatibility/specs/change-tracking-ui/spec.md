## MODIFIED Requirements

### Requirement: Rendering Task Groups
Task groups SHALL render with an optional header at column zero and task rows with visible completion markers. Rows SHALL retain relative nesting and ordered-list labels. Visual nesting SHALL be capped at three levels to preserve reading space. Wrapped descriptions SHALL align under their text, and a blank description SHALL display "Untitled task".

#### Scenario: Completed Task in Group
- **WHEN** a Task has status done=true
- **THEN** a green checkmark "✓" is displayed before the Task text, and the text is shown in muted color

#### Scenario: Incomplete Task in Group
- **WHEN** a Task has status done=false and an empty or whitespace checkbox
- **THEN** an open-circle marker is displayed before its text in the primary color

#### Scenario: Group Header
- **WHEN** a group has a header (group.title)
- **THEN** the header is displayed above Tasks without leading indent; if all Tasks in the group are completed — the header is shown in muted color, otherwise — in accent color

#### Scenario: Nested Ordered Tasks
- **WHEN** a completed ordered parent has an unfinished nested task
- **THEN** its original ordered label is shown, the child is indented, and the change remains active with Apply available and Archive absent

#### Scenario: Custom Unfinished Marker
- **WHEN** an unfinished task has a single-character marker such as `~` or `-`
- **THEN** the row displays that bracketed marker and the task list explains that only checked tasks count as done

#### Scenario: Narrow Sidebar And Empty Description
- **WHEN** a deeply nested task wraps in a narrow sidebar or has no description
- **THEN** indentation is capped at six columns, wrapping stays aligned with its description, and an empty description is visible as "Untitled task"

## ADDED Requirements

### Requirement: Task List Readiness Guidance
The Tasks section SHALL explain when no tracked tasks exist. When every tracked task is checked, the change card SHALL remind the user to review before archiving; checkbox completion alone is not review or verification.

#### Scenario: No Tracked Tasks
- **WHEN** a change has no tracked checkboxes
- **THEN** the Tasks section displays "No tasks yet" and the change is not presented as complete

#### Scenario: All Tasks Checked
- **WHEN** all tracked tasks are complete
- **THEN** the card displays a review reminder alongside its existing Archive and Update actions
