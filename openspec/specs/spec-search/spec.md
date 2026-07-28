## Purpose
Specification search enables finding needed specifications, requirements and scenarios by text query with multi-keyword search, filtering and match highlighting.

## Requirements

### Requirement: Matching Across All Specification Artifacts
System SHALL search query across entire specification text: capability name, H1 title, Purpose section, as well as requirement names and descriptions, scenario names and lines. Schema keywords (SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT) and Markdown markup SHALL NOT be considered in matching — they appear in every specification and are meaningless as search conditions.

#### Scenario: Schema Keywords Not Searched
- **WHEN** user enters query `shall`, `must`, `when` or `then`
- **THEN** result is empty, though these words exist in every specification text

#### Scenario: Markdown Markup Not Searched
- **WHEN** user enters query `**` or `- **WHEN**`
- **THEN** result is empty

#### Scenario: Keyword Next To Regular Word
- **WHEN** query contains both keyword and regular word — e.g., `SHALL show`
- **THEN** keyword is dropped, search proceeds on remaining word

#### Scenario: Match By Capability Name
- **WHEN** query is a substring of specification directory name
- **THEN** specification appears in result

#### Scenario: Match By Purpose
- **WHEN** query occurs in `## Purpose` text of specification
- **THEN** specification appears in result

#### Scenario: Match By Title
- **WHEN** H1 title differs from directory name and contains query
- **THEN** specification appears in result, though title itself is displayed nowhere

#### Scenario: Match Within Requirement
- **WHEN** query occurs in requirement name or description of specification
- **THEN** specification appears in result

#### Scenario: Match Within Scenario
- **WHEN** query occurs in scenario name or body line (e.g., `- **WHEN** …`)
- **THEN** specification appears in result

#### Scenario: Case Insensitive
- **WHEN** query case differs from specification text case
- **THEN** match is still counted

### Requirement: Multi-Word Query
System SHALL treat query as a set of tokens separated by spaces, requiring each token to match; tokens may match in different artifacts of one specification.

#### Scenario: All Tokens Found In Different Artifacts
- **WHEN** one query token occurs in Purpose and another — in scenario text of same specification
- **THEN** specification appears in result

#### Scenario: One Token Not Found
- **WHEN** at least one query token doesn't occur in any artifact of specification
- **THEN** specification is excluded from result

#### Scenario: Empty Query
- **WHEN** query is empty or consists only of spaces
- **THEN** all specifications are returned in original order

### Requirement: Matching Requirements Counter
System SHALL report for each found specification the number of requirements whose own text (name, description, scenarios) satisfies query.

#### Scenario: Match Within Requirements
- **WHEN** two requirements of specification satisfy query
- **THEN** result for this specification contains matching requirements counter equal to 2

#### Scenario: Match Only At Specification Level
- **WHEN** query matched title or Purpose but no requirement satisfies it
- **THEN** matching requirements counter equals 0

### Requirement: Search Field
System SHALL display a single-line input field with "⌕" icon and muted placeholder text, accepting focus on mouse click, with one-line padding below the field.

#### Scenario: Field At Rest
- **WHEN** field is not focused and query is empty
- **THEN** icon "⌕" and placeholder in `textMuted` color display

#### Scenario: Padding Below Field
- **WHEN** field renders above list
- **THEN** one empty line remains between field and first list item

#### Scenario: Cursor Doesn't Blink
- **WHEN** field is focused
- **THEN** cursor displays steady (non-blinking), so sidebar redraws (row hover, data poll) don't reset blink phase

#### Scenario: Focus On Click
- **WHEN** user presses mouse button on search field
- **THEN** field receives keyboard focus, shows cursor and accepts character input

#### Scenario: Input Updates Query
- **WHEN** user types or pastes text into focused field
- **THEN** handler receives new value on each change, without confirmation

#### Scenario: Clearing Query
- **WHEN** query is not empty and user presses "✕" to the right of field
- **THEN** field value and query are cleared

### Requirement: Search Within Specification
System SHALL show same search field in specification detail view, use same query as in specifications list, and filter requirements by it — including their scenario text.

#### Scenario: Query Carries Over When Entering Specification
- **WHEN** user with non-empty query opens a specification from filtered list
- **THEN** search field within specification contains same text, and requirement list is immediately filtered by it

#### Scenario: Match By Requirement Or Scenario
- **WHEN** query occurs in requirement name, description or scenario names/lines
- **THEN** requirement remains in list

#### Scenario: Matching Scenarios Counter
- **WHEN** scenarios of a requirement satisfy query
- **THEN** requirement row shows number of matching scenarios instead of total count

#### Scenario: Query Preserved On Return
- **WHEN** user presses "← back" from specification
- **THEN** search field in specifications list contains same query, and list remains filtered

#### Scenario: Changing Query Within Specification
- **WHEN** user edits query in field within specification
- **THEN** change applies to specifications list after return as well

### Requirement: Keyboard Focus Return
System SHALL return keyboard focus to element that owned it before field focus (opencode prompt) when field loses focus, and SHALL determine focus state from renderer, not own flag.

#### Scenario: Another Element Took Focus
- **WHEN** user clicks on opencode prompt while field is focused
- **THEN** field stops highlighting as active, and next click on it returns focus and cursor to field again

#### Scenario: Focus Lost On Esc
- **WHEN** field is focused and user presses Esc
- **THEN** field loses focus, entered query is preserved, and focus returns to previous element

#### Scenario: Focus Lost On Enter
- **WHEN** field is focused and user presses Enter
- **THEN** field loses focus, and focus returns to previous element

#### Scenario: Unmounting Focused Field
- **WHEN** focused field is removed from screen (section collapsed or detail view opened)
- **THEN** focus returns to previous element, not remaining on removed field
