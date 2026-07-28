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
