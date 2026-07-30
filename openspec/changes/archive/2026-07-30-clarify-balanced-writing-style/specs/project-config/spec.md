## ADDED Requirements

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
