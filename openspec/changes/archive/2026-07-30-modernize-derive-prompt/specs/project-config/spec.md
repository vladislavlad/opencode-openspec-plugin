## ADDED Requirements

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
