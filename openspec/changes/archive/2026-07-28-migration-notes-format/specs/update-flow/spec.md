## MODIFIED Requirements

### Requirement: Update Completion Prompt
Update completion prompt SHALL consist of sequential stages, each separated by `---` before and after block. Context stage SHALL name version range and report about restart (without separators). Migration stage SHALL start with imperative instruction "execute these steps" and list `instructions` by versions; if no steps — stage is skipped entirely. Flag removal stage SHALL be present only for range from `plugin.update-in-progress` and contain instruction to delete block, preserving rest of config.yaml content. Release notes stage SHALL start with `## Release Notes` heading, then instruction "tell user about news", then list release notes by versions as bullet lists (`- Item text`). Each stage (migration, flag removal, release notes) SHALL be separated by `---` before and after block. Agent SHALL execute migration and flag removal stages silently and include in response to user only release notes stage.

#### Scenario: Steps Exist In Range
- **WHEN** at least one entry in range has non-empty `instructions`
- **THEN** prompt contains migration stage with imperative heading, steps by versions and separators `---` before and after block

#### Scenario: No Steps, Only Release Notes
- **WHEN** all entries in range have empty `instructions`
- **THEN** migration stage is skipped entirely, prompt proceeds to next stage

#### Scenario: Range From Flag
- **WHEN** range obtained from `plugin.update-in-progress`
- **THEN** prompt contains separate stage with instruction to delete block `plugin.update-in-progress`, preserving rest of config.yaml content, separated by `---`

#### Scenario: Agent Doesn't Paraphrase Actions
- **WHEN** agent receives prompt with separated stages and separators
- **THEN** agent executes migration and flag removal silently, and passes user only summary from release notes

#### Scenario: Release Notes Have Section Heading
- **WHEN** release notes stage is assembled
- **THEN** it starts with `## Release Notes` heading before any version blocks

#### Scenario: Release Notes Items Are Bullet List
- **WHEN** a migration entry has multiple release note items
- **THEN** each item renders as a separate bullet list line (`- Item text`) instead of being joined into a paragraph
