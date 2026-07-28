## Purpose
OpenSpec specifications viewing interface with requirement navigation and collapsible scenarios.

## Requirements

### Requirement: Displaying Specification Row
System SHALL display specification row with name, accent marker and requirement count — total or, during active search with matches within requirements, number of matching ones.

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
