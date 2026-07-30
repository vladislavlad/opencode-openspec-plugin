## MODIFIED Requirements

### Requirement: Specifications Section
Sidebar SHALL display collapsible "Specifications" section with search field above list and specifications from summary, filtered by query. Below the search field the section SHALL render the tree node for the current area — the root when no area is entered, and the root as well when that area no longer exists. The area header SHALL follow the node being rendered rather than the area that was entered, so it never names an area that is not on screen. The header count SHALL stay the number of specifications matching the query across every level, regardless of which area is open.

#### Scenario: Root Node Shown By Default
- **WHEN** the section is expanded and no area has been entered
- **THEN** it shows the search field, then the root node — areas and capabilities without an area

#### Scenario: Header Count Spans All Levels
- **WHEN** specifications live inside areas
- **THEN** the header counts all of them, not only the ones visible at the current level

#### Scenario: Area That Disappeared Leaves No Header
- **WHEN** the area being shown is gone from the next poll, because files moved
- **THEN** the section renders the root node and the area header disappears with it, instead of naming an area that no longer exists

#### Scenario: Search Field Stays Above The Node
- **WHEN** the user has entered an area
- **THEN** the search field is still the first element of the section, above the area header and the node

### Requirement: Navigation With Detail Views
Sidebar SHALL support detailed navigation through Changes, specifications and requirements with mutually exclusive selection state. Entering an area SHALL be part of that state: it holds the area's full path, and it resets the change, specification and requirement selections.

#### Scenario: Entering An Area
- **WHEN** the user clicks an area row
- **THEN** the section renders that area's node under an area header, and change, specification and requirement selections reset

#### Scenario: Area Header Shape
- **WHEN** the user is inside an area
- **THEN** an `Area` label shares one row with the back control, and the area's path sits on the row below it with the same marker its row carried, wrapping instead of colliding with the control

#### Scenario: Back Returns To The Parent Area
- **WHEN** the user presses back inside `area-1/area-1-a`
- **THEN** the section renders `area-1`, not the root

#### Scenario: Back From A Top-Level Area
- **WHEN** the user presses back inside `area-1`
- **THEN** the section renders the root node and the area header disappears

#### Scenario: Opening A Specification From Inside An Area
- **WHEN** the user selects a capability shown inside an area
- **THEN** `SpecDetail` opens for it, and returning from it comes back to that area, not to the root

## ADDED Requirements

### Requirement: Query Flattens The Specifications Tree
Sidebar SHALL search the whole tree regardless of the area the user is in, and while the query is non-empty SHALL drop the grouping and show matching specifications from every level as one flat list, so no match hides behind an area. Because the results are not confined to the current area, the area header and its back control SHALL be hidden while filtering. Clearing the query SHALL restore both, and the tree, at the area the user was in.

#### Scenario: Matches From Every Level Are Listed
- **WHEN** the query matches specifications inside areas and outside them
- **THEN** all of them appear in one list, with no `Areas` or `Capabilities` heading and no area rows

#### Scenario: Search Is Not Confined To The Current Area
- **WHEN** the user is inside `area-1` and the query matches a specification in `area-2`
- **THEN** that specification appears in the results

#### Scenario: Area Context Hidden While Filtering
- **WHEN** the query becomes non-empty while the user is inside an area
- **THEN** the area header and the back control disappear, since the list below them is no longer that area's

#### Scenario: Query Reset Restores The Current Area
- **WHEN** the user clears the query while inside `area-1`
- **THEN** the area header and back control return and the section renders `area-1`'s node, not the root

#### Scenario: Header Count Matches What Is Listed
- **WHEN** a query is active
- **THEN** the header count equals the number of rows shown

#### Scenario: Returning From A Specification Found By Search
- **WHEN** the user opens a specification from the flat result list and presses back
- **THEN** the query is still in the field and the flat result list is shown again
