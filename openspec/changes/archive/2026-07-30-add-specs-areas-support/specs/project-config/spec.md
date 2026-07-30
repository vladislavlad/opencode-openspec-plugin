## ADDED Requirements

### Requirement: CONFIG_PROMPT — Spec Structure Question
`CONFIG_PROMPT` SHALL ask how specs are organized, as a single-select with exactly two options described by the layout each produces: "Flat" — every capability at one level, `specs/<capability>/spec.md`; "Hierarchical" — capabilities grouped into areas, `specs/<area>/<capability>/spec.md`. No third "follow the files" option is offered: derivation already reconciles the setting with the actual layout, so such an option would ask the user to choose between a preference and a non-answer.

#### Scenario: Question Present
- **WHEN** the configuration questions are asked
- **THEN** one of them is a single-select for spec structure with exactly the options "Flat" and "Hierarchical"

#### Scenario: Options Named By Their Layout
- **WHEN** the user sees the question
- **THEN** each option states the directory layout it produces, so the choice is made against a path and not a label

### Requirement: CONFIG_PROMPT — Spec Structure Persisted To Config
`CONFIG_PROMPT` SHALL record the chosen structure as a `specStructure` line in the `context` block, alongside the stack, language and style already written there. No new top-level key is added to config.yaml, and no plugin state is involved — the value exists so the derivation prompt can read it.

#### Scenario: Value Written To Context
- **WHEN** the agent writes `openspec/config.yaml` after the user picked a structure
- **THEN** the `context` block carries `specStructure: flat` or `specStructure: hierarchical`

#### Scenario: Plugin Block Untouched
- **WHEN** the config is written with a spec structure
- **THEN** the `plugin:` block is preserved unchanged, as for every other config write

#### Scenario: Absent Value Is Not An Error
- **WHEN** a config written before this change has no `specStructure` line
- **THEN** readers treat it as "flat" rather than reporting a problem
