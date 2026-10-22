## MODIFIED Requirements

### Requirement: Tasks Parsing From tasks.md
The system SHALL count task checkboxes consistently with OpenSpec 1.14.3, including nested, unordered and ordered list items. A checkbox holds at most one non-whitespace character; only `x` or `X` means complete. Empty and other single-character markers remain unfinished. Markdown headings SHALL group tasks, and Markdown links SHALL not become tasks.

#### Scenario: Completed And Uncompleted Task
- **WHEN** file contains `- [x] Done task` and `- [ ] Pending task`
- **THEN** first Task has `done: true`, second — `done: false`; total equals 2, completed equals 1

#### Scenario: Tasks Grouped By Headings
- **WHEN** Tasks are separated by line `## Backend`
- **THEN** Tasks before heading fall into group with empty title, Tasks after — into group with title `Backend`

#### Scenario: Nested And Ordered Tasks
- **WHEN** tasks use leading whitespace, `+`, `*`, `-`, or ordered markers with one to nine digits followed by `.` or `)`
- **THEN** all those checkboxes contribute to progress in document order

#### Scenario: Empty Padded And Unfinished Markers
- **WHEN** tasks use `[]`, `[~]`, `[-]`, `[ x ]`, or `[ X]`
- **THEN** all five tasks are counted and only the last two are complete

#### Scenario: Links Are Not Tasks
- **WHEN** a list item contains `[A](./doc.md)`, `[1][ref]`, or a multi-character bracket label
- **THEN** it does not contribute to task progress

#### Scenario: Whitespace Checkbox Followed By Brackets
- **WHEN** an unfinished whitespace-only checkbox is immediately followed by `(` or `[` in its description
- **THEN** it still counts as unfinished work, consistently with OpenSpec

#### Scenario: Windows Line Endings And Documented Checkboxes
- **WHEN** tasks use CRLF endings or appear inside a fenced example or HTML comment
- **THEN** their counts match OpenSpec and their descriptions exclude trailing whitespace

#### Scenario: Task Presentation Survives Polling
- **WHEN** a task's indentation, ordered-list label, or unfinished marker changes without changing its description or completion flag
- **THEN** the next sidebar poll updates that presentation while retaining the task counts
