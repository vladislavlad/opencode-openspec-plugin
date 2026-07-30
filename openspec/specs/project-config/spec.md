## Purpose
Project configuration prompt: defining stack, specification language, context and rules with writing them to `openspec/config.yaml`. Assembled in two forms — as separate command `/opsx-config` and as step within initialization prompt.

## Requirements

### Requirement: CONFIG_PROMPT — Initialization Presence Check
The system SHALL check for directory `openspec/` before executing configuration and require running initialization when it's absent. Separate command `/opsx-config` checks for directory presence, while configuration step inside init prompt doesn't: installation earlier in that same prompt just created `openspec/`.

#### Scenario: OpenSpec Not Initialized
- **WHEN** prompt `/opsx-config` runs in project without directory `openspec/`
- **THEN** model informs user about need to run OpenSpec initialization and stops

#### Scenario: Step Inside Init
- **WHEN** configuration step is assembled as part of init prompt
- **THEN** it doesn't contain check for `openspec/` — directory was created at installation step earlier in same prompt

### Requirement: CONFIG_PROMPT — Empty Project And Language Handling
The system SHALL NOT attempt to derive context from empty project and offer only human languages.

#### Scenario: Empty Project
- **WHEN** project has no code, README or manifests
- **THEN** prompt skips context derivation and immediately asks user for stack, language, context and style without offering to create or select another project

#### Scenario: Spec Language
- **WHEN** prompt asks specification language
- **THEN** only natural (human) languages are offered, not programming languages

### Requirement: CONFIG_PROMPT Preserves Plugin Block
Prompt `CONFIG_PROMPT` SHALL instruct agent to preserve existing block `plugin:` in `openspec/config.yaml` unchanged when overwriting file.

#### Scenario: Configuration Overwrite With Setup Marker
- **WHEN** agent overwrites config.yaml at configuration step and `plugin.init` is present in file
- **THEN** block `plugin:` is preserved in file unchanged

#### Scenario: Configuration Overwrite With Update Flag
- **WHEN** agent overwrites config.yaml and `plugin.update-in-progress` is present in file
- **THEN** block `plugin:` is preserved in file unchanged

### Requirement: CONFIG_PROMPT — Task Granularity Two Options
`CONFIG_PROMPT` SHALL offer exactly two levels of Task granularity — "High-level" and "Detailed" — and describe them by work volume, not execution time.

#### Scenario: Tasks Question Composition
- **WHEN** user answered "Yes" to question "Configure detailed rules?"
- **THEN** "Tasks" question offers exactly two options: "High-level" with description "a few high-level tasks" and "Detailed" with description "sub-tasks grouped under high-level sections"

#### Scenario: Hints Don't Measure Time
- **WHEN** configuration prompt is assembled
- **THEN** it doesn't contain options "Coarse", "Medium", "Fine" and doesn't describe Tasks by duration ("~half-day", "~1-2h")

#### Scenario: Rule In Config
- **WHEN** user selected "High-level"
- **THEN** `rules.tasks` receives rule "a few high-level tasks"

#### Scenario: Rule In Config For Detailed Granularity
- **WHEN** user selected "Detailed"
- **THEN** `rules.tasks` receives rule "sub-tasks grouped under high-level sections"

### Requirement: CONFIG_PROMPT — Writing Style Descriptions
The system SHALL include a one-sentence description with each writing style option in the "Style" question of `CONFIG_PROMPT`, so the choice is made against a stated definition rather than a bare label.

#### Scenario: Technical Style Description Present
- **WHEN** prompt asks for writing style
- **THEN** "Technical" option includes a description indicating precise, implementation-focused language

#### Scenario: Product Style Description Present
- **WHEN** prompt asks for writing style
- **THEN** "Product" option includes a description indicating outcome-focused, user-oriented language

#### Scenario: Balanced Style Description Present
- **WHEN** prompt asks for writing style
- **THEN** "Balanced" option includes a description clarifying it mixes technical precision where needed with readability for non-engineers

### Requirement: CONFIG_PROMPT — Style Descriptions Define The Axis
The system SHALL frame the three style descriptions along the same axis so their relationship is clear: Technical ↔ Balanced ↔ Product.

#### Scenario: Styles Form A Coherent Spectrum
- **WHEN** prompt presents all three writing style options
- **THEN** each description references the same dimension (technical precision vs user-oriented clarity) making "Balanced" the midpoint between "Technical" and "Product"

### Requirement: CONFIG_PROMPT — Style Meaning Persisted To Config
The system SHALL write the chosen writing style into the `context` block together with its one-line meaning, so an agent that later generates artifacts reads the definition and not only the style name. The style stays one line of `context` — no new field is introduced.

#### Scenario: Style Written With Its Meaning
- **WHEN** agent writes `openspec/config.yaml` after the user picked a style
- **THEN** the context line carries the style name followed by its one-sentence meaning, e.g. `Writing style: Balanced (technical precision where it matters, readable by non-engineers)`

#### Scenario: Persisted Meaning Matches The Offered One
- **WHEN** the description shown in the "Style" question is compared with the one written to `context`
- **THEN** both state the same axis, so selection and consumption share a single definition

#### Scenario: Consuming Agent Needs No Outside Knowledge
- **WHEN** an agent generating a proposal, spec or tasks reads `context` alone
- **THEN** the style line tells it what the style means, without reference to the config prompt

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

### Requirement: CONFIG_PROMPT — Language Rule Persisted Verbatim
`CONFIG_PROMPT` SHALL write the spec language rule into the `context` block word for word, marked off so its boundaries are unambiguous, and SHALL forbid paraphrasing or shortening it. The rule is the same text the derivation prompt hands to its sub-agents, kept as one shared definition so the two cannot drift. It SHALL name the requirement's own name after `Requirement:` and the scenario's name after `Scenario:` as prose belonging to the spec language, and SHALL state that a marker covers only itself.

#### Scenario: Rule Written Word For Word
- **WHEN** the agent writes `openspec/config.yaml`
- **THEN** the `context` block carries the language rule unchanged, with no paraphrase and nothing omitted

#### Scenario: Copy Boundaries Are Explicit
- **WHEN** the prompt presents the rule for copying
- **THEN** its start and end are marked, and the markers themselves are excluded from what gets copied

#### Scenario: Names Covered By The Persisted Rule
- **WHEN** an agent later generates an artifact reading only `context`
- **THEN** the rule there tells it that requirement and scenario names belong to the spec language, rather than staying in English

#### Scenario: One Text, Two Call Sites
- **WHEN** the rule persisted by config is compared with the one derivation gives its sub-agents
- **THEN** they are the same text, because both render one shared definition
