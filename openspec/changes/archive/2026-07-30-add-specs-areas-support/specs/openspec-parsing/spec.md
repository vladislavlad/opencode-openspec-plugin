## MODIFIED Requirements

### Requirement: Changes and Specifications Aggregation
The system SHALL read all subdirectories from `specs/` and `changes/`, parse their files, skip `changes/archive`, and sort results by name. Under `specs/` the walk SHALL be recursive: a directory holding `spec.md` is a capability, a directory holding no `spec.md` is a grouping level whose subdirectories are walked in turn. Specifications SHALL be collected into one flat list regardless of depth.

#### Scenario: Nested Capability Found
- **WHEN** `specs/backend/auth/spec.md` exists
- **THEN** the specification is present in the summary, alongside any flat ones

#### Scenario: Grouping Level Is Not A Specification
- **WHEN** `specs/backend/` holds no `spec.md` of its own
- **THEN** `backend` produces no specification entry, only the capabilities found beneath it

#### Scenario: Counts Cover Every Depth
- **WHEN** the project holds both flat and nested specifications
- **THEN** `specCount` and `requirementCount` include all of them

## ADDED Requirements

### Requirement: Specification Name Is Its Path
The system SHALL name a specification by its path from `specs/`, joined with `/` — `backend/auth` for `specs/backend/auth/spec.md`, `project-config` for `specs/project-config/spec.md`. This is the same id the OpenSpec CLI reports, so a name from the plugin and a name from the CLI refer to the same specification.

#### Scenario: Nested Name Carries Its Area
- **WHEN** a specification is parsed from `specs/backend/auth/spec.md`
- **THEN** its name is `backend/auth`

#### Scenario: Flat Name Unchanged
- **WHEN** a specification is parsed from `specs/project-config/spec.md`
- **THEN** its name is `project-config`, as before this change

#### Scenario: Same Capability Name In Two Areas
- **WHEN** both `specs/backend/auth/spec.md` and `specs/web/auth/spec.md` exist
- **THEN** they are two distinct specifications, `backend/auth` and `web/auth`

### Requirement: Grouping Is Not Stored In The Summary
The system SHALL NOT add an areas field to the summary. Grouping is derived from specification names wherever it is needed, so poll deduplication, search and selection keep working on the single flat list.

#### Scenario: Summary Shape Unchanged
- **WHEN** a project with areas is read
- **THEN** the summary exposes the same fields as before — the specification list is flat, with nested specifications inside it

#### Scenario: Deduplication Needs No Area Comparison
- **WHEN** two consecutive polls read identical files in a project with areas
- **THEN** the summaries compare equal and no re-render occurs
