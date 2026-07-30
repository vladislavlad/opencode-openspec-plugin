## Purpose
Rules that every plugin prompt must follow regardless of which capability it belongs to: what language to converse with the user in and how to ask multi-select questions.

## Requirements

### Requirement: Prompts Speak To User In Their Language, Preserving Terms
Every prompt that addresses the user — asks questions or paraphrases something for them — SHALL instruct to conduct dialogue in the language the user writes in, and SHALL prohibit transliterating OpenSpec terms (proposal, change, spec, requirement, scenario, task), leaving them in English. The instruction SHALL appear once in the prompt, not repeat with each nested step.

#### Scenario: Dialogue In User's Language
- **WHEN** any of the prompts that ask questions is assembled: `/opsx-config`, `/opsx-baseline`, initialization or its fallback variant
- **THEN** it contains an instruction to write questions, options and summaries in user's language and not transliterate OpenSpec terms

#### Scenario: Paraphrasing Release Notes
- **WHEN** the update completion prompt is assembled, instructing to paraphrase release notes for the user
- **THEN** it contains the same instruction — paraphrase in user's language, OpenSpec terms without transliteration

#### Scenario: Instruction Not Duplicated
- **WHEN** initialization prompt embeds configuration and derivation steps within itself
- **THEN** the dialogue language instruction appears exactly once

### Requirement: Multi-Select Is Specified As An Instruction, Not A Remark
Prompts SHALL require enabled multi-select as a separate instruction for each question where it's needed: capability list confirmation, "Stack" and "Context". The wording SHALL explicitly state that the user must be able to select multiple options at once.

#### Scenario: Capability List Confirmation
- **WHEN** derivation prompt is assembled
- **THEN** confirmation phase contains an instruction to enable multi-select, not a mention of "multi-select" in parentheses

#### Scenario: Configuration Questions
- **WHEN** configuration prompt is assembled
- **THEN** it has a separate line requiring enabled multi-select for "Stack" and "Context"

#### Scenario: Question About Found Capabilities
- **WHEN** confirmation phase asks a question
- **THEN** it asks which of the listed capabilities to write specifications for, not which additional capabilities to add

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
