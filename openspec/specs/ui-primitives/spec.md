## Purpose
Set of common UI components for terminal interface: progress bar, button, divider, detail header, text paragraph, collapsible section and uninitialized project screen.

## Requirements

### Requirement: ProgressBar Displays Progress Or Hides
Component SHALL display visual progress bar with filled and empty blocks and percentage when total is greater than zero; when total equals zero component SHALL render nothing. When prop `showNumberOfTasks` is set, component SHALL additionally display line "N/M tasks done" above bar in `muted` color.

#### Scenario: Progress Displays With Tasks
- **WHEN** total equals 10 and done equals 5
- **THEN** filled blocks (█), empty blocks (░) and text "50%" show on screen

#### Scenario: Progress Hidden Without Tasks
- **WHEN** total equals 0
- **THEN** component displays nothing

#### Scenario: Task Counter Displays With showNumberOfTasks
- **WHEN** total equals 10, done equals 3 and `showNumberOfTasks` equals true
- **THEN** above progress bar line "3/10 tasks done" in muted color displays

#### Scenario: Task Counter Hidden Without showNumberOfTasks
- **WHEN** total equals 10, done equals 3 and `showNumberOfTasks` is not set or equals false
- **THEN** counter line doesn't display, only progress bar visible

### Requirement: Button Responds To Hover And Click
Component SHALL change background color to given color on cursor hover, return original background on cursor leave, and call onClick on mouse press.

#### Scenario: Background Highlights On Hover
- **WHEN** cursor is over button
- **THEN** backgroundColor set to props.color value, and text color switched to theme background

#### Scenario: Click Calls Handler
- **WHEN** user presses button with mouse (mouseDown)
- **THEN** onClick function is called

### Requirement: Button In Locked State
Component SHALL accept lock indicator and locked button click handler as one set of props, suitable for spreading on any button. Locked button SHALL remain visible and clickable, but SHALL call lock handler instead of primary one.

#### Scenario: Locked Button Appearance
- **WHEN** lock indicator returns true
- **THEN** text displays in `textMuted` color, and on hover background fills with `textMuted` instead of button color

#### Scenario: Click On Locked Button
- **WHEN** user presses locked button
- **THEN** lock handler is called, and `onClick` is not called

#### Scenario: Lock Indicator Not Set
- **WHEN** lock props are not passed
- **THEN** button behaves normally — click calls `onClick`

### Requirement: Divider Draws Horizontal Line
Component SHALL render horizontal line in current theme's borderSubtle color exactly across container width, occupying one line at any sidebar width.

#### Scenario: Divider Displays With Correct Color
- **WHEN** component renders with valid theme
- **THEN** horizontal line of color theme.borderSubtle is visible on screen

#### Scenario: Narrow Sidebar
- **WHEN** sidebar width is less than default line length
- **THEN** line occupies exactly one line across full width, without wrapping remainder to next line

### Requirement: DetailHeader Shows Heading And Back Button
Component SHALL display bold label on left — in accent color or given via `color` — clickable "← back" text on right with background highlight on hover, Divider below header line and empty line above it.

#### Scenario: Header And Back Button Visible
- **WHEN** component renders with label "Tasks"
- **THEN** bold text "Tasks" in accent color displays on left, "← back" on right, Divider below

#### Scenario: Back Button Responds To Hover
- **WHEN** cursor is over "← back" area
- **THEN** background fills with `accent` color, and text repaints to `background`

#### Scenario: Custom Header Color
- **WHEN** component receives `color`
- **THEN** label displays in this color instead of accent

### Requirement: Paragraph Splits Text By Lines With Word Wrap
Component SHALL split props.text by newline character (\n), render each line as separate terminal line with word-wrap, and replace empty lines with space.

#### Scenario: Multi-line Text Displays Correctly
- **WHEN** text contains "Hello\nWorld"
- **THEN** two lines on screen: first — "Hello", second — "World", both with wrapMode word

#### Scenario: Empty Line Renders As Space
- **WHEN** text contains "Line1\n\nLine3"
- **THEN** between "Line1" and "Line3" an empty line containing one space character displays

### Requirement: CollapsibleSection Expands And Collapses Content
Component SHALL show indicator ▼ when open and ▶ when closed, display label in header, and children with Divider — only when open returns true. Counter `count` SHALL be optional: for object `{ done, total }` header shows "Label: done/total", for number — "Label: N". Without counter — only label. In collapsed state component SHALL display passed `collapsedSummary`, if present.

#### Scenario: Section Expanded
- **WHEN** open() returns true
- **THEN** indicator "▼", text "Label: 3", Divider and child content are visible

#### Scenario: Section Collapsed
- **WHEN** open() returns false
- **THEN** indicator "▶" and header are visible, but Divider and children hidden

#### Scenario: Header Without Counter
- **WHEN** `count` is not passed
- **THEN** header shows only label, without colon and number

#### Scenario: Preview In Collapsed State
- **WHEN** section is collapsed and `collapsedSummary` is passed
- **THEN** it displays below header instead of child content

#### Scenario: Click On Header Calls onToggle
- **WHEN** user presses mouse on section header line
- **THEN** onToggle function is called

### Requirement: Markdown Renders Artifact Text
System SHALL provide markdown render primitive, displaying headings, bullets, fenced code blocks and regular paragraphs. Lines that don't fall under any of these forms SHALL render as paragraph via `Paragraph`. Tables, links, nested lists and inline formatting SHALL NOT be supported — their markup passes through as regular text.

#### Scenario: Heading
- **WHEN** line starts with one or more `#`
- **THEN** it displays without `#` characters, in heading color

#### Scenario: Bullet
- **WHEN** line starts with list marker `-` or `*`
- **THEN** it displays with marker and word wrap

#### Scenario: Code Block
- **WHEN** text contains section between fence lines (``` or ~~~)
- **THEN** section content displays as-is, and lines within are not interpreted as headings or bullets

#### Scenario: Regular Text
- **WHEN** line is not a heading, bullet or part of code block
- **THEN** it renders as paragraph via `Paragraph` with word wrap

#### Scenario: Empty Lines At Text Edges
- **WHEN** text starts or ends with empty lines — e.g., file ends with newline
- **THEN** they don't produce their own screen lines, and content isn't separated by extra empty row from what's drawn around it

#### Scenario: Empty Lines Within Text
- **WHEN** several consecutive empty lines appear within text
- **THEN** on screen exactly one empty row remains between paragraphs

### Requirement: NotInitialised Shows Initialization Invitation
Component SHALL display muted text "Not initialized for this project" and "Init" button, whose click calls onInit.

#### Scenario: Uninitialized Project Screen Visible
- **WHEN** component renders
- **THEN** screen shows text "Not initialized for this project" in textMuted color and button with label "Init"

#### Scenario: Init Button Calls Handler
- **WHEN** user presses "Init" button
- **THEN** onInit function is called

### Requirement: ClearButton Clears Input Field
System SHALL provide ClearButton primitive — clickable "✕" with one-character right padding, muted at rest and with accent fill on hover, like "← back" button.

#### Scenario: Button At Rest
- **WHEN** ClearButton is drawn and cursor not over it
- **THEN** "✕" displays in `textMuted` color without background, with one-character right padding

#### Scenario: Highlight On Hover
- **WHEN** cursor is over ClearButton
- **THEN** background fills with `accent` color, and glyph repaints to `background`

#### Scenario: Clear On Click
- **WHEN** user presses mouse button on ClearButton
- **THEN** onClear handler is called
