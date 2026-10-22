## ADDED Requirements

### Requirement: Task Grouping Across Line Endings
The task parser SHALL produce identical task counts, group titles, task metadata and nesting for equivalent LF and CRLF input. Headings SHALL start a new group and reset nesting for either line ending.

#### Scenario: Windows Task File
- **WHEN** tasks.md uses CRLF with multiple headings, nested tasks and ordered tasks
- **THEN** groups, completion counts, markers, numbers and depths equal those parsed from the LF version

#### Scenario: Nesting Reset At A CRLF Heading
- **WHEN** a CRLF heading follows nested tasks and its first task is indented
- **THEN** that task begins at depth zero in the new named group
