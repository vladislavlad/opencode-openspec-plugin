## MODIFIED Requirements

### Requirement: Displaying Change row in list
The system SHALL display each Change row with name, status indicator (green for completed, yellow for active), and progress bar with task counter.

#### Scenario: Active Change in list
- **WHEN** Change has incomplete Tasks
- **THEN** row displays a yellow dot (`warning`) before the name and a progress bar with task counter enabled

#### Scenario: Completed Change in list
- **WHEN** all Tasks of Change are completed
- **THEN** row displays a green dot (`success`) before the name and a fully filled progress bar

### Requirement: Task counter in section heading
Section "Tasks" SHALL show only label without counter. Progress is displayed via ProgressBar with `showNumberOfTasks` below the Change name.

#### Scenario: Tasks heading without counter
- **WHEN** Change card is open with nine Tasks, five of which are completed
- **THEN** section heading shows "Tasks" without a number, and progress with counter is visible in ProgressBar below the Change name

#### Scenario: Progress remains in header
- **WHEN** Change card is open with Tasks
- **THEN** a progress bar with `showNumberOfTasks` is displayed below the Change name, showing "N/M tasks done"
