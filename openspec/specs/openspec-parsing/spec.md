## Purpose
Module parses `spec.md` and `tasks.md` files from openspec directory, transforming Markdown markup into structured data: specifications, requirements, scenarios, Changes and Tasks. The plugin's own state in `config.yaml` is not part of this — it belongs to `plugin-lifecycle`.

## Requirements

### Requirement: Root Directory Detection
The system SHALL work with a single root directory `openspec` — the same one hardcoded in CLI — considering it ready if it contains subdirectories **or** file `config.yaml`.

#### Scenario: openspec Directory Contains Subdirectories
- **WHEN** directory `openspec` contains at least one subdirectory
- **THEN** system uses `openspec` as root directory

#### Scenario: Immediately After openspec init
- **WHEN** directory `openspec` has no subdirectories but contains file `config.yaml`
- **THEN** system uses `openspec` as root directory and returns summary with empty specification and change lists

#### Scenario: Directory Not Found
- **WHEN** `openspec` is absent or contains neither subdirectories nor `config.yaml`
- **THEN** function returns null

### Requirement: Specification Title Parsing
The system SHALL extract title from the first H1 heading (`#`) of spec.md, removing "Specification:" prefix or "Specification" suffix.

#### Scenario: Title With Specification Suffix
- **WHEN** H1 contains string like `My Feature Specification`
- **THEN** title equals `My Feature`

#### Scenario: Title With Specification: Prefix
- **WHEN** H1 contains string like `Specification: My Feature`
- **THEN** title equals `My Feature`

#### Scenario: No H1 Heading
- **WHEN** spec.md has no H1 heading
- **THEN** title is taken from capability directory name

### Requirement: Purpose Parsing
The system SHALL extract specification purpose from text under `## Purpose`. There's no text between H1 and first H2 in OpenSpec schema, so it's not parsed or stored.

#### Scenario: Purpose Section Present
- **WHEN** file contains `## Purpose` with text below it
- **THEN** purpose field contains this text without leading and trailing empty lines

#### Scenario: Text Between Heading And First Section Ignored
- **WHEN** a paragraph of text sits between H1 and first H2
- **THEN** it's stored nowhere, parse result contains only name, title, purpose and requirements

### Requirement: spec.md Parsing Bound to spec-driven Schema
Parsing of `spec.md` and its model SHALL live in a separate schema module `spec-driven` — alongside knowledge of its syntax: `### Requirement:` / `#### Scenario:` headings, SHALL/MUST keywords and WHEN/THEN.

#### Scenario: Another Schema Appears
- **WHEN** support for a schema other than `spec-driven` is needed
- **THEN** a separate module with its own parser and model is added, while directory reading and summary assembly remain unchanged

### Requirement: Separating Schema Syntax From Text
The schema module SHALL provide a function that removes schema keywords and Markdown markup from text so consumers (search) work with prose without knowing syntax.

#### Scenario: Keywords Removed
- **WHEN** words SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT appear as standalone words in text
- **THEN** function returns text without them

#### Scenario: Markup Removed
- **WHEN** `*`, `_`, `` ` `` or leading list marker appear in text
- **THEN** function returns text without these characters

### Requirement: Requirements and Scenarios Parsing
The system SHALL extract requirements from `### Requirement:` within `## Requirements` section, and scenarios from `#### Scenario:` within each requirement.

#### Scenario: Requirement With Description and Scenarios
- **WHEN** in `## Requirements` there's `### Requirement: Auth` with description text and `#### Scenario: Login`
- **THEN** result contains requirement named `Auth`, its description, and scenario named `Login`

#### Scenario: Scenario Name Without Prefix
- **WHEN** H4 heading is `Scenario: Happy Path`
- **THEN** scenario name equals `Happy Path` ("Scenario:" prefix removed)

#### Scenario: Scenario Without Explicit Name
- **WHEN** H4 heading doesn't contain `Scenario:` prefix
- **THEN** scenario name equals full heading text

### Requirement: Ignoring Headings Inside Code Blocks
The system SHALL skip lines with `#`, `##`, `###` inside fenced code blocks (``` or ~~~), not interpreting them as structure.

#### Scenario: H3 Inside Code Block
- **WHEN** line `### Requirement: Fake` is between ``` and ```
- **THEN** this requirement is not added to parse result

### Requirement: Tasks Parsing From tasks.md
The system SHALL recognize Markdown checkboxes (`- [ ]`, `- [x]`) as Tasks with completion flag, and Markdown headings — as Task groups.

#### Scenario: Completed And Uncompleted Task
- **WHEN** file contains `- [x] Done task` and `- [ ] Pending task`
- **THEN** first Task has `done: true`, second — `done: false`; total equals 2, completed equals 1

#### Scenario: Tasks Grouped By Headings
- **WHEN** Tasks are separated by line `## Backend`
- **THEN** Tasks before heading fall into group with empty title, Tasks after — into group with title `Backend`

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

#### Scenario: Archive Skipped
- **WHEN** directories `feature-a` and `archive` exist in `changes/`
- **THEN** result contains only Change `feature-a`

#### Scenario: Results Sorted
- **WHEN** specifications with names `zeta` and `alpha` are found
- **THEN** specs array is ordered as `[alpha, zeta]`

### Requirement: Parsing Change Markdown Artifacts Into Sections
The system SHALL parse Change artifacts (`proposal.md`, `design.md`) by `##` headings and skip headings inside code blocks. Parsing — in a separate module, not tied to `spec-driven` schema.

#### Scenario: File Sliced By Headings
- **WHEN** `proposal.md` contains `## Why` and `## What Changes` with text under each
- **THEN** result contains two sections with these names and text of each without leading and trailing empty lines

#### Scenario: Heading Inside Code Block
- **WHEN** line `## Why` is between fence lines (``` or ~~~)
- **THEN** new section is not created, line remains part of current section body

#### Scenario: Section Selection By Name
- **WHEN** caller requests a section by name case-insensitively
- **THEN** its body is returned, and empty result when section doesn't exist

#### Scenario: Text Before First Heading
- **WHEN** file starts with text before any `##`
- **THEN** this text falls into no named section

### Requirement: Stripping Inline Markup From Text
The system SHALL remove `**` characters from displayed text. Strip — at render level: the parsed model keeps the markers, and only rendering drops them. `**` is the only inline marker handled this way — the rest of the inline markup passes through as regular text.

#### Scenario: Markers Dropped From Displayed Text
- **WHEN** a heading, a bullet or a prose line carries `**text**`
- **THEN** it displays as `text`, without the asterisks

#### Scenario: Parsed Model Keeps The Markers
- **WHEN** a scenario line `- **WHEN** condition` is parsed
- **THEN** the stored line keeps its `**`, so rendering can find the keyword and highlight it

#### Scenario: Fenced Code Block Left Alone
- **WHEN** `**` occurs inside a fenced code block
- **THEN** it displays as written — a code block is shown verbatim

#### Scenario: Other Inline Markup Passes Through
- **WHEN** text carries inline markup other than `**`, such as `_underscores_` or a link
- **THEN** it displays as regular text with its markup intact

### Requirement: Artifact Text Teaser
The system SHALL assemble a teaser from the beginning of first non-empty paragraph, truncated by character budget. Budget — in characters, not lines. Truncation — at word boundary with ellipsis. Teaser is empty when there's no text.

#### Scenario: Teaser From Beginning Of Text
- **WHEN** teaser is requested for multi-paragraph text
- **THEN** only first non-empty paragraph is returned

#### Scenario: Teaser Source In Proposal
- **WHEN** teaser is assembled from parsed Proposal
- **THEN** block named "Why" is taken, or if absent — first block

#### Scenario: Paragraph Longer Than Budget
- **WHEN** first paragraph exceeds given character count
- **THEN** it's truncated at last word boundary fitting budget, ending with ellipsis without broken word or dangling punctuation

#### Scenario: Text Shorter Than Budget
- **WHEN** first paragraph fits within budget
- **THEN** it's returned in full, without ellipsis

#### Scenario: Empty Text
- **WHEN** there's no text or it consists of whitespace
- **THEN** teaser is empty

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
