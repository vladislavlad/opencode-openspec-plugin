## ADDED Requirements

### Requirement: Parsing change markdown artifacts into sections
The system SHALL parse change artifacts (`proposal.md`, `design.md`) by `##` headings and skip headings inside code blocks. Parsing is in a separate module, not tied to the `spec-driven` schema.

#### Scenario: File split by headings
- **WHEN** `proposal.md` contains `## Why` and `## What Changes` with text under each
- **THEN** result contains two sections with those names and text for each without leading or trailing blank lines

#### Scenario: Heading inside code block
- **WHEN** line `## Why` is between fence lines (``` or ~~~)
- **THEN** a new section is not created, the line remains part of the current section body

#### Scenario: Section selection by name
- **WHEN** caller requests a section by name case-insensitively
- **THEN** its body is returned, and when no such section exists – an empty result

#### Scenario: Text before first heading
- **WHEN** file begins with text that has no `##` preceding it
- **THEN** this text does not enter any named section

### Requirement: Stripping inline markup from text
The system SHALL remove `**` characters from displayed text. Stripping is at the render level.

### Requirement: Artifact text teaser
The system SHALL assemble a teaser from the beginning of the first non-empty paragraph, truncated to a character budget. Budget – in characters, not lines. Truncation – at word boundary with ellipsis. Teaser is empty when there is no text.

#### Scenario: Teaser from beginning of text
- **WHEN** a teaser is requested for multi-paragraph text
- **THEN** only the first non-empty paragraph is returned

#### Scenario: Teaser source in proposal
- **WHEN** a teaser is assembled from a parsed proposal
- **THEN** the block named "Why" is taken, and when absent – the first block

#### Scenario: Paragraph longer than budget
- **WHEN** first paragraph exceeds the given number of characters
- **THEN** it is truncated at the last word boundary fitting within the budget, and ends with ellipsis without a broken word or dangling punctuation mark

#### Scenario: Text shorter than budget
- **WHEN** first paragraph fits within the budget
- **THEN** it is returned in full, without ellipsis

#### Scenario: Empty text
- **WHEN** there is no text or it consists of whitespace characters
- **THEN** teaser is empty
