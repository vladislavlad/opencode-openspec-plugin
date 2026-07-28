## ADDED Requirements

### Requirement: spec.md parsing bound to spec-driven schema
Parsing of `spec.md` and its model SHALL live in a separate schema module `spec-driven` – alongside knowledge of its syntax: headings `### Requirement:` / `#### Scenario:`, keywords SHALL/MUST and WHEN/THEN.

#### Scenario: Appearance of another schema
- **WHEN** support is needed for a schema other than `spec-driven`
- **THEN** a separate module with its own parser and model is added, while directory reading and summary assembly remain unchanged

### Requirement: Separating schema syntax from text
The schema module SHALL provide a function that removes schema keywords and Markdown markup from text so consumers (search) work with prose without knowing the syntax.

#### Scenario: Keywords removed
- **WHEN** words SHALL, MUST, WHEN, THEN, GIVEN, AND, BUT appear as separate words in text
- **THEN** the function returns text without them

#### Scenario: Markup removed
- **WHEN** `*`, `_`, `` ` `` or leading list markers appear in text
- **THEN** the function returns text without these characters

## MODIFIED Requirements

### Requirement: Purpose parsing
The system SHALL extract specification purpose from text under `## Purpose`. There is no text between H1 and the first H2 in the OpenSpec schema, so it is not parsed or stored.

#### Scenario: Purpose section present
- **WHEN** file contains `## Purpose` with text below it
- **THEN** the purpose field contains this text without leading and trailing blank lines

#### Scenario: Text between heading and first section ignored
- **WHEN** a paragraph of text exists between H1 and first H2
- **THEN** it is not stored anywhere, and parse result contains only name, title, purpose, and requirements

## RENAMED Requirements

- FROM: `### Requirement: Description and purpose parsing`
- TO: `### Requirement: Purpose parsing`
