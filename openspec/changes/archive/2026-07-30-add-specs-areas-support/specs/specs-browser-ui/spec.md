## MODIFIED Requirements

### Requirement: Displaying Specification Row
System SHALL display specification row with name, accent marker and requirement count — total or, during active search with matches within requirements, number of matching ones. Inside a tree node the row SHALL read the last segment of the specification's path, since the node itself supplies the area; in a flat list drawn without that context it SHALL read the full path. The value reported on click SHALL always be the full path.

#### Scenario: Nested Specification Shows Its Leaf Name In A Node
- **WHEN** a row renders `backend/auth` inside the node for `backend`
- **THEN** the row reads `auth`, and clicking it calls `onSelect` with `backend/auth`

#### Scenario: Flat List Shows The Full Path
- **WHEN** rows are drawn without a node around them, as in search results
- **THEN** each row reads its full path, so `backend/auth` and `web/auth` are told apart

## ADDED Requirements

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
