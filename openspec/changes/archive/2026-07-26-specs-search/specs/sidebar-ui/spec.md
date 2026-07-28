## MODIFIED Requirements

### Requirement: Completed changes section
The sidebar SHALL display a collapsible "Completed Changes" section with all completed changes and expand it once when completed changes appear for the first time.

#### Scenario: Display completed changes
- **WHEN** summary contains changes for which `isComplete()` returns `true`
- **THEN** the "Completed Changes" section displays `ChangeRow` rows with item count in heading

#### Scenario: Auto-expand on element appearance
- **WHEN** completed changes appear for the first time after load
- **THEN** the section automatically expands once, further state is determined by user

### Requirement: Specifications section
The sidebar SHALL display a collapsible "Specifications" section with a search field above the list and specifications from summary filtered by query.

#### Scenario: Display specifications
- **WHEN** summary contains a list of specifications and search query is empty
- **THEN** the "Specifications" section displays a search field, below it `SpecRow` rows with total item count in heading

#### Scenario: Auto-expand on element appearance
- **WHEN** specifications appear for the first time after load
- **THEN** the section automatically expands once

#### Scenario: Search field above list
- **WHEN** the "Specifications" section is expanded
- **THEN** as the first section element, before all spec rows, a search field with placeholder "Search specs" appears

#### Scenario: Filter list by query
- **WHEN** the user entered a query in the search field
- **THEN** the list shows only specifications satisfying the query, and counter in section heading reflects match count

#### Scenario: Empty result
- **WHEN** query is non-empty and no specification satisfies it
- **THEN** muted text "No matches" appears instead of a list

#### Scenario: Reset query
- **WHEN** query is cleared
- **THEN** the list again shows all specifications, and counter – their total count
