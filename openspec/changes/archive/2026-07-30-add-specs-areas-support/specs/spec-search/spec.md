## MODIFIED Requirements

### Requirement: Matching Across All Specification Artifacts
System SHALL search query across entire specification text: capability name, H1 title, Purpose section, as well as requirement names and descriptions, scenario names and lines. A specification's name is its path from `specs/`, so its area segments are part of the searched text. Schema keywords (SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT) and Markdown markup SHALL NOT be considered in matching — they appear in every specification and are meaningless as search conditions.

#### Scenario: Match By Capability Name
- **WHEN** query is a substring of specification name — the capability directory for a flat specification, the full path for one inside an area
- **THEN** specification appears in result

#### Scenario: Match By Title
- **WHEN** H1 title differs from the specification name and contains query
- **THEN** specification appears in result, though title itself is displayed nowhere

## ADDED Requirements

### Requirement: Match By Area Name
System SHALL return every specification under an area when the query matches that area's segment of the name. Matching SHALL stay a single pass over the flat specification list, with no grouping-specific traversal and no separate area index.

#### Scenario: Area Name Returns Its Capabilities
- **WHEN** the query is `backend` and `backend/auth`, `backend/api` exist
- **THEN** both specifications appear in the result

#### Scenario: Nested Area Segment Matches
- **WHEN** the query is `area-1-a` and `area-1/area-1-a/auth` exists
- **THEN** the specification appears in the result

#### Scenario: Full Path As Query
- **WHEN** the query is `backend/auth`
- **THEN** that specification appears in the result, and a specification named `web/auth` does not

#### Scenario: Areas Are Not Results
- **WHEN** a query matches an area segment
- **THEN** the result holds specifications only — an area has no spec.md and never appears as a result of its own

#### Scenario: One Pass Over One List
- **WHEN** a project mixes flat and grouped specifications
- **THEN** every specification is considered exactly once
