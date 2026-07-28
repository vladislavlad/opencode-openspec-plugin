## ADDED Requirements

### Requirement: Matching across all spec artifacts
The system SHALL search the query against the entire text of a specification: capability name, H1 title, Purpose section, as well as requirement names and descriptions, scenario names and lines. Schema keywords (SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT) and Markdown markup SHALL NOT be considered during matching – they appear in every specification and are meaningless as search conditions.

#### Scenario: Schema keywords not searchable
- **WHEN** the user enters query `shall`, `must`, `when`, or `then`
- **THEN** result is empty, even though these words appear in every spec's text

#### Scenario: Markdown markup not searchable
- **WHEN** the user enters query `**` or `- **WHEN**`
- **THEN** result is empty

#### Scenario: Keyword adjacent to regular word
- **WHEN** the query contains both a keyword and a regular word – e.g. `SHALL display`
- **THEN** the keyword is dropped, and search proceeds on the remaining word

#### Scenario: Match by capability name
- **WHEN** the query is a substring of the spec directory name
- **THEN** the specification appears in results

#### Scenario: Match by Purpose
- **WHEN** the query appears in the `## Purpose` text of a specification
- **THEN** the specification appears in results

#### Scenario: Match by title
- **WHEN** the H1 title differs from directory name and contains the query
- **THEN** the specification appears in results, even though the title itself is not displayed anywhere

#### Scenario: Match within requirement
- **WHEN** the query appears in a spec's requirement name or description
- **THEN** the specification appears in results

#### Scenario: Match within scenario
- **WHEN** the query appears in a scenario name or body line (e.g. in `- **WHEN** …`)
- **THEN** the specification appears in results

#### Scenario: Case-insensitive matching
- **WHEN** query case differs from spec text case
- **THEN** match is still counted

### Requirement: Multi-word query
The system SHALL treat a query as a set of tokens separated by spaces and require each token to match; tokens may match in different artifacts of the same specification.

#### Scenario: All tokens found across different artifacts
- **WHEN** one query token appears in Purpose, and another – in scenario text of the same specification
- **THEN** the specification appears in results

#### Scenario: One token not found
- **WHEN** at least one query token does not appear in any spec artifact
- **THEN** the specification is excluded from results

#### Scenario: Empty query
- **WHEN** the query is empty or consists only of spaces
- **THEN** all specifications are returned in original order

### Requirement: Matched requirement counter
The system SHALL report for each found specification the number of requirements whose own text (name, description, scenarios) satisfies the query.

#### Scenario: Match within requirements
- **WHEN** two requirements of a specification satisfy the query
- **THEN** the result for that specification contains a matched requirement counter equal to 2

#### Scenario: Match only at spec level
- **WHEN** the query matched title or Purpose, but no requirement satisfies it
- **THEN** the matched requirement counter is 0

### Requirement: Search field
The system SHALL display a single-line input field with "⌕" icon and muted placeholder text, accepting focus on mouse click, with one blank line below the field.

#### Scenario: Field at rest
- **WHEN** the field is not focused and query is empty
- **THEN** the "⌕" icon and placeholder in `textMuted` color are displayed

#### Scenario: Padding below field
- **WHEN** the field is rendered above a list
- **THEN** one blank line remains between the field and the first list item

#### Scenario: Non-blinking cursor
- **WHEN** the field is focused
- **THEN** the cursor displays steady (non-blinking) so sidebar redraws (row hover, data polling) don't reset the blink phase

#### Scenario: Focus on click
- **WHEN** the user clicks the mouse on the search field
- **THEN** the field receives keyboard focus, shows a cursor, and accepts character input

#### Scenario: Input updates query
- **WHEN** the user types or pastes text into the focused field
- **THEN** the handler receives the new value on each change, without confirmation

#### Scenario: Clearing query
- **WHEN** the query is non-empty and the user presses "✕" to the right of the field
- **THEN** the field value and query are cleared

### Requirement: Search within specification
The system SHALL display the same search field in spec detail view, use the same query as in the specifications list, and filter requirements by it – including their scenario text.

#### Scenario: Query carries over on navigation to spec
- **WHEN** the user with a non-empty query opens a specification from the filtered list
- **THEN** the search field inside the specification contains the same text, and the requirement list is immediately filtered by it

#### Scenario: Match by requirement or scenario
- **WHEN** the query appears in a requirement's name, description, or scenario names/lines
- **THEN** the requirement remains in the list

#### Scenario: Matched scenario counter
- **WHEN** scenarios of a requirement satisfy the query
- **THEN** the requirement row shows matched scenario count instead of total count

#### Scenario: Query persists on return
- **WHEN** the user presses "← back" from a specification
- **THEN** the search field in the specifications list contains the same query, and the list remains filtered

#### Scenario: Changing query within spec
- **WHEN** the user edits the query in the field inside a specification
- **THEN** the change applies to the specifications list after return

### Requirement: Keyboard focus return
The system SHALL return keyboard focus to the element that held it before focusing the field (the opencode prompt) on blur, and SHALL determine focus state from the renderer rather than its own flag.

#### Scenario: Focus taken by another element
- **WHEN** the user clicks the opencode prompt while the field is focused
- **THEN** the field stops highlighting as active, and the next click on it returns focus and cursor to the field

#### Scenario: Blur on Esc
- **WHEN** the field is focused and the user presses Esc
- **THEN** the field loses focus, entered query is preserved, and focus returns to the previous element

#### Scenario: Blur on Enter
- **WHEN** the field is focused and the user presses Enter
- **THEN** the field loses focus, and focus returns to the previous element

#### Scenario: Unmounting a focused field
- **WHEN** a focused field is removed from screen (section collapsed or detail-view opened)
- **THEN** focus returns to the previous element rather than remaining on the removed field
