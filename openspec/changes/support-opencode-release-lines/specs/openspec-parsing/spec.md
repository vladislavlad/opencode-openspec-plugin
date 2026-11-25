## ADDED Requirements

### Requirement: Wrapped task descriptions
The sidebar SHALL show the full first paragraph of a task, using the same continuation boundaries as OpenSpec 2.2.

#### Scenario: A task wraps across lines
- **WHEN** a checkbox description continues onto another line in the same Markdown paragraph
- **THEN** the sidebar joins those lines in the description and counts a single task
