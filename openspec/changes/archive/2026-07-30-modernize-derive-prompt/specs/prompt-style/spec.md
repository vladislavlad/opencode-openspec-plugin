## ADDED Requirements

### Requirement: The Spec Language Rule Is One Shared Definition
Prompts SHALL carry the spec language policy as a single shared rule rather than restating it per call site, so the text configuration persists into `context` and the text derivation hands to its sub-agents cannot drift apart. The rule SHALL name every prose slot of a spec — the requirement statement, the requirement's own name after `Requirement:`, the scenario's name after `Scenario:`, the WHEN/THEN lines and the Purpose text — as belonging to the spec language, SHALL list what stays unchanged (the structural markers, the keywords SHALL/WHEN/THEN, and code identifiers), and SHALL state that a marker covers only itself.

#### Scenario: One Definition, Both Call Sites
- **WHEN** the configuration prompt and the derivation prompt are assembled
- **THEN** both contain the same language rule text, because both render one definition

#### Scenario: Heading Names Are Named As Prose
- **WHEN** the rule is read
- **THEN** it says outright that the names following `### Requirement:` and `#### Scenario:` are written in the spec language, rather than leaving that to be inferred from "requirement statements and scenario text"

#### Scenario: A Marker Covers Only Itself
- **WHEN** the rule lists `### Requirement:` among the markers to keep unchanged
- **THEN** it also states that the name after the marker is not part of it, so a heading is never left in the wrong language because its marker is English

#### Scenario: Identifiers Are Not Prose
- **WHEN** a spec names a class, function, file, field, enum value or API term
- **THEN** the rule leaves it unchanged, since only prose follows the spec language
