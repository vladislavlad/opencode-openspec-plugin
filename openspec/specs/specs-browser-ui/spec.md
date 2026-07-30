## Purpose
OpenSpec specifications viewing interface with requirement navigation and collapsible scenarios.

## Requirements

### Requirement: Displaying Specification Row
System SHALL display specification row with name, accent marker and requirement count — total or, during active search with matches within requirements, number of matching ones. Inside a tree node the row SHALL read the last segment of the specification's path, since the node itself supplies the area; in a flat list drawn without that context it SHALL read the full path. The value reported on click SHALL always be the full path.

#### Scenario: Nested Specification Shows Its Leaf Name In A Node
- **WHEN** a row renders `backend/auth` inside the node for `backend`
- **THEN** the row reads `auth`, and clicking it calls `onSelect` with `backend/auth`

#### Scenario: Flat List Shows The Full Path
- **WHEN** rows are drawn without a node around them, as in search results
- **THEN** each row reads its full path, so `backend/auth` and `web/auth` are told apart

#### Scenario: Spec Row Displays Name And Requirement Counter
- **WHEN** component SpecRow receives specification object without match counter
- **THEN** specification name appears on screen with accent marker "▪" before name and text `N requirements` in muted color

#### Scenario: Row Shows Number Of Matching Requirements
- **WHEN** SpecRow receives matching requirements counter greater than zero
- **THEN** instead of total count, text `N matching requirements` displays

#### Scenario: Match Outside Requirements Doesn't Change Counter
- **WHEN** SpecRow receives matching requirements counter equal to zero
- **THEN** regular text `N requirements` displays

#### Scenario: Row Highlight On Hover
- **WHEN** mouse cursor is over specification row
- **THEN** row background changes to `textMuted` color, and requirement counter displays in normal text color

#### Scenario: Selecting Specification By Click
- **WHEN** user presses mouse button on specification row
- **THEN** onSelect handler is called with specification name

### Requirement: Specification Detail View
System SHALL display specification name and Purpose section if present. Title (title) and text between H1 and first section are not displayed: they duplicate capability name and don't belong to OpenSpec schema.

#### Scenario: Specification Name Always Visible
- **WHEN** SpecDetail opens for any specification
- **THEN** DetailHeader with "back" button and specification name with marker "▪" display, without title line and without description

#### Scenario: Purpose Section Displays When Present
- **WHEN** specification has purpose field set
- **THEN** below specification name a section with label "Purpose" in accent color and purpose text appears

### Requirement: Requirements List In Detail Specification
System SHALL display under `Requirements` heading a search field and list of specification requirements filtered by query, with ability to navigate to each requirement.

#### Scenario: Requirements Listed With Scenario Counter
- **WHEN** specification has requirements and search query is empty
- **THEN** below Purpose section displays heading `Requirements: N`, divider, search field and requirement rows, each containing name and scenario count

#### Scenario: Empty Requirements List
- **WHEN** specification has no requirements (requirements.length === 0)
- **THEN** muted text "No requirements" displays instead of list

#### Scenario: Filtering Requirements By Query
- **WHEN** query is not empty
- **THEN** list shows only requirements matching query, and counter in `Requirements` heading reflects their count

#### Scenario: Query Found No Requirements
- **WHEN** specification has requirements but none match query
- **THEN** muted text "No matches" displays instead of list

#### Scenario: Requirement Row Shows Matching Scenarios Count
- **WHEN** requirement row receives matching scenarios counter greater than zero
- **THEN** instead of total count, text `N matching scenarios` displays

#### Scenario: Navigating To Requirement By Click
- **WHEN** user presses on requirement row in list
- **THEN** onOpenReq handler is called with requirement name

### Requirement: Requirement Detail View
System SHALL display selected requirement's name, description and scenario list.

#### Scenario: Requirement Name And Description Visible
- **WHEN** RequirementDetail opens for a requirement
- **THEN** DetailHeader with "back" button, requirement name in bold accent color and if present — paragraph with description display

#### Scenario: Keywords Highlighted
- **WHEN** word `SHALL` occurs in requirement description text
- **THEN** each occurrence of `SHALL` renders in accent color, rest of text — normal

#### Scenario: Scenarios Listed With Counter
- **WHEN** requirement has scenarios
- **THEN** below description displays heading `Scenarios: N`, divider and list of collapsible scenarios

#### Scenario: Empty Scenarios List
- **WHEN** requirement has no scenarios (scenarios.length === 0)
- **THEN** muted text "No scenarios" displays instead of list

### Requirement: Collapsible Scenarios
System SHALL render each scenario as a collapsible block, expanding on click.

#### Scenario: Scenario Collapsed By Default
- **WHEN** scenario is displayed and defaultOpen is not set or equals false
- **THEN** only header row with arrow "▶" and scenario name shows, body hidden

#### Scenario: Expanding Scenario On Click
- **WHEN** user presses on collapsed scenario header row
- **THEN** scenario body expands with left offset (paddingLeft=2), and arrow changes to "▼"

#### Scenario: Auto-expand When Few Scenarios
- **WHEN** requirement has fewer than 4 scenarios
- **THEN** all scenarios open by default (defaultOpen=true)

#### Scenario: Line With Keyword Highlighted
- **WHEN** scenario line matches pattern `- **KEYWORD** text` (e.g., `- **WHEN** condition`)
- **THEN** keyword renders in accent color, rest of text — normal color

#### Scenario: Line Without Keyword Displays Muted
- **WHEN** scenario line doesn't contain highlighted keyword in format `- **KEYWORD**`
- **THEN** entire line renders in muted color (textMuted)

### Requirement: Specification Tree Built From Names
System SHALL group specifications into a tree derived from their names, where every path segment before the last is a grouping level. Grouping SHALL be a pure function of the specification list, computed for display and not read from the summary.

#### Scenario: Tree From Mixed Names
- **WHEN** the list holds `project-config`, `backend/auth` and `backend/api`
- **THEN** the root node has one area `backend` holding two capabilities, plus one capability `project-config` of its own

#### Scenario: Flat List Yields A Root Without Areas
- **WHEN** no specification name contains `/`
- **THEN** the root node has no areas and holds every specification directly

### Requirement: Node Rendering With Labelled Groups
System SHALL render a tree node as its areas followed by its own capabilities, each group under a heading carrying the group's name and the count at that level — `Areas: N` and `Capabilities: N`. The headings SHALL appear once an area is in play, meaning the node has areas of its own or is itself inside one. At the root of a project with no areas there is nothing to divide, so the capabilities SHALL render as a plain list with no heading. The same rendering SHALL serve the root and every area.

#### Scenario: Node With Areas Is Labelled
- **WHEN** a node has areas and capabilities of its own
- **THEN** `Areas: N` heads the area rows and `Capabilities: N` heads the capability rows below them, each count being that level's own

#### Scenario: Inside An Area Without Sub-Areas
- **WHEN** the node for an area has capabilities but no areas
- **THEN** the `Areas` heading is absent and `Capabilities: N` still heads its capabilities

#### Scenario: Project With No Areas Is Unlabelled
- **WHEN** the root node has no areas
- **THEN** its capabilities render as a plain list, with neither heading

#### Scenario: Area Without Its Own Capabilities
- **WHEN** a node has areas but no capabilities of its own
- **THEN** the `Areas: N` heading renders and the `Capabilities` heading is absent

#### Scenario: Ordering Within A Node
- **WHEN** a node renders
- **THEN** areas are listed alphabetically, then capabilities alphabetically

### Requirement: Area Row
System SHALL display an area as a row carrying the area's own name, an accent marker and the number of specifications it holds at any depth. The row SHALL report the click with the area's full path.

#### Scenario: Area Row Shows Name And Count
- **WHEN** area `backend` holds three specifications
- **THEN** the row reads `backend` with the muted text `3 capabilities`

#### Scenario: Count Includes Nested Areas
- **WHEN** area `backend` holds one capability of its own and a sub-area with two
- **THEN** the row reads `3 capabilities`

#### Scenario: Nested Area Reports Its Full Path
- **WHEN** the user clicks area `area-1-a` displayed inside `area-1`
- **THEN** the handler receives `area-1/area-1-a`

#### Scenario: Area Row Highlight On Hover
- **WHEN** the mouse cursor is over an area row
- **THEN** the row highlights the way a specification row does
