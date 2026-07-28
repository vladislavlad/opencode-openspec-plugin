## ADDED Requirements

### Requirement: Markdown renders artifact text
The system SHALL provide a markdown render primitive displaying headings, bullets, fenced code blocks, and regular paragraphs. Lines that do not match any of these forms SHALL be rendered as paragraphs via `Paragraph`. Tables, links, nested lists, and inline formatting SHALL not be supported – their markup passes through as plain text.

#### Scenario: Heading
- **WHEN** a line begins with one or more `#`
- **THEN** it is displayed without `#` characters, in heading color

#### Scenario: Bullet
- **WHEN** a line begins with list marker `-` or `*`
- **THEN** it is displayed with the marker and word-wrapped

#### Scenario: Code block
- **WHEN** text contains a section between fence lines (``` or ~~~)
- **THEN** the section content is displayed as-is, and lines within it are not interpreted as headings or bullets

#### Scenario: Plain text
- **WHEN** a line is not a heading, bullet, or part of a code block
- **THEN** it is rendered as a paragraph via `Paragraph` with word-wrapping

#### Scenario: Blank lines at text edges
- **WHEN** text begins or ends with blank lines – for example, file ends with a newline
- **THEN** they do not produce their own screen lines, and content is not separated by an extra empty row from what is drawn around it

#### Scenario: Blank lines within text
- **WHEN** several blank lines appear consecutively within text
- **THEN** exactly one empty row remains between paragraphs on screen

## MODIFIED Requirements

### Requirement: CollapsibleSection expands and collapses content
The component SHALL show a ▼ indicator when open and ▶ when closed, display label in the heading, and children along with Divider – only when open returns true. Counter `count` SHALL be optional: with object `{ done, total }` the heading shows "Label: done/total", with a number – "Label: N". Without counter – only label. In collapsed state the component SHALL display the passed `collapsedSummary`, if present.

#### Scenario: Section expanded
- **WHEN** open() returns true
- **THEN** indicator "▼" is visible, text "Label: 3", Divider separator, and child content

#### Scenario: Section collapsed
- **WHEN** open() returns false
- **THEN** indicator "▶" and heading are visible, but Divider and children are hidden

#### Scenario: Heading without counter
- **WHEN** `count` is not passed
- **THEN** heading shows only label, without colon and number

#### Scenario: Preview in collapsed state
- **WHEN** section is collapsed and `collapsedSummary` is passed
- **THEN** it is displayed below the heading instead of child content

#### Scenario: Click on heading triggers onToggle
- **WHEN** user clicks with mouse on the section heading line
- **THEN** the onToggle function is called
