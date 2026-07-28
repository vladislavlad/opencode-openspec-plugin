## MODIFIED Requirements

### Requirement: ProgressBar displays progress or hides
The component SHALL display a visual progress bar with filled and empty blocks and percentage when total is greater than zero; when total equals zero the component SHALL render nothing. When prop `showNumberOfTasks` is set, the component SHALL additionally display line "N/M tasks done" above the bar in `muted` color.

#### Scenario: Progress displayed when Tasks exist
- **WHEN** total equals 10 and done equals 5
- **THEN** filled blocks (█), empty blocks (░), and text "50%" are shown on screen

#### Scenario: Progress hidden when no Tasks
- **WHEN** total equals 0
- **THEN** component renders nothing

#### Scenario: Task counter displayed with showNumberOfTasks
- **WHEN** total equals 10, done equals 3, and `showNumberOfTasks` equals true
- **THEN** above the progress bar line "3/10 tasks done" is displayed in muted color

#### Scenario: Task counter hidden without showNumberOfTasks
- **WHEN** total equals 10, done equals 3, and `showNumberOfTasks` is not set or equals false
- **THEN** counter line is not displayed, only progress bar is visible
