## MODIFIED Requirements

### Requirement: Spec row display
The system SHALL display a spec row with name, accent marker, and requirement count – total or, during active search with internal matches, the matched count.

#### Scenario: Spec row displays name and requirement counter
- **WHEN** the SpecRow component receives a spec object without match count
- **THEN** the screen shows spec name with an accent marker "▪" to the right of the name and text `N requirements` in muted color

#### Scenario: Row shows matched requirement count
- **WHEN** SpecRow receives a matched requirement counter greater than zero
- **THEN** instead of total count, text `N matching requirements` is displayed

#### Scenario: Match outside requirements doesn't change counter
- **WHEN** SpecRow receives a matched requirement counter equal to zero
- **THEN** regular text `N requirements` is displayed

#### Scenario: Row highlight on hover
- **WHEN** the mouse cursor is over the spec row
- **THEN** row background changes to `textMuted` color, and requirement counter displays in normal text color

#### Scenario: Spec selection by click
- **WHEN** the user clicks the mouse on a spec row
- **THEN** onSelect handler is called with the spec name

### Requirement: Specification detail view
The system SHALL display the specification name and Purpose section if present. Title (title) and text between H1 and the first section are not displayed: they duplicate capability name and are not part of the OpenSpec schema.

#### Scenario: Spec name always visible
- **WHEN** SpecDetail opens for any specification
- **THEN** DetailHeader with back button and spec name with "▪" marker appear, without title line and without description

#### Scenario: Purpose section displayed when present
- **WHEN** the specification has a purpose field set
- **THEN** below the spec name appears a section labeled "Purpose" in accent color with purpose text

### Requirement: Requirements list in detail spec
The system SHALL display under the `Requirements` heading a search field and a requirements list filtered by query, with navigation to each requirement.

#### Scenario: Requirements listed with scenario counter
- **WHEN** the specification has requirements and search query is empty
- **THEN** below the Purpose section appears heading `Requirements: N`, divider, search field, and requirement rows, each containing name and scenario count

#### Scenario: Empty requirements list
- **WHEN** the specification has no requirements (requirements.length === 0)
- **THEN** muted text "No requirements" is displayed instead of a list

#### Scenario: Requirement filtering by query
- **WHEN** the query is non-empty
- **THEN** the list shows only requirements satisfying the query, and counter in `Requirements` heading reflects their count

#### Scenario: Query finds no requirements
- **WHEN** the specification has requirements but none satisfy the query
- **THEN** muted text "No matches" is displayed instead of a list

#### Scenario: Requirement row shows matched scenario count
- **WHEN** requirement row receives a matched scenario counter greater than zero
- **THEN** instead of total count, text `N matching scenarios` is displayed

#### Scenario: Navigate to requirement by click
- **WHEN** the user clicks on a requirement row in the list
- **THEN** onOpenReq handler is called with the requirement name
