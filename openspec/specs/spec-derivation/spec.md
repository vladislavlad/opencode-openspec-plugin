## Purpose
Derivation prompt: reverse-engineering specifications from existing code. Defines what counts as a capability, how project exploration depth is chosen, how work is distributed to sub-agents, and what derivation is allowed to edit. Triggered by command `/opsx-baseline` and by a step within initialization prompt.

## Requirements

### Requirement: Derivation Prompt Asks Project Exploration Depth
Derivation prompt SHALL ask user for code exploration depth — "Overview" or "Deep" — before starting to read project, warning about deep mode cost. The question SHALL be asked by the caller, while derivation body merely follows chosen depth without its own branching. Chosen depth SHALL determine both overview pass that assembles capability list and sub-agent work at detail stage.

#### Scenario: Question Asked Before Reading Code
- **WHEN** derivation is launched by command `/opsx-baseline`
- **THEN** first a separate question about depth with options "Overview" and "Deep" is asked, and only after answer does project overview begin

#### Scenario: In Init Depth Is Asked Along With Derivation Consent
- **WHEN** initialization prompt reaches derivation step
- **THEN** one `question` call offers "Yes – Overview", "Yes – Deep" and "No", and no separate depth question exists in prompt

#### Scenario: Derivation Body Doesn't Branch
- **WHEN** any prompt including derivation is assembled
- **THEN** common derivation part is the same and contains no conditional wording like "already answered above" — only the question asked by caller differs

#### Scenario: "Deep" Doesn't Mean "Open Every File"
- **WHEN** user selected "Deep"
- **THEN** prompt states that real execution paths are read, while tests, fixtures, generated and vendored code are skipped at any depth

#### Scenario: Cost Warning
- **WHEN** user is shown "Deep" option
- **THEN** its description states such analysis may take significant time and tokens

#### Scenario: High-Level Analysis
- **WHEN** "Overview" is selected
- **THEN** capability list is assembled from README, folder structure, manifests and entry points, and sub-agent reads entry points and main capability modules without reading all their files

#### Scenario: Deep Analysis
- **WHEN** "Deep" is selected
- **THEN** capability list is assembled after reading code for each area, not by folder layout, and sub-agent walks through capability execution paths from start to finish, including error handling and edge cases, recording them as separate scenarios

### Requirement: Derivation Searches For Capabilities In Any Kind Of Project
Derivation prompt SHALL name what exactly counts as a capability: what project provides its user, integrations and external systems it depends on, and behavior it implements itself rather than taking from a library. Prompt SHALL explicitly state that project doesn't have to be an application: in infrastructure, configuration or tooling repository, the described behavior is the declared configuration itself.

#### Scenario: What To Search Is Named Explicitly
- **WHEN** derivation prompt is assembled
- **THEN** it lists all three capability kinds without illustrative examples and doesn't restate stack and architecture — they're already described in `openspec/config.yaml` and AGENTS.md

#### Scenario: Repository Without Application Code
- **WHEN** project consists of configurations, manifests or scripts and contains no application code
- **THEN** prompt instructs to describe declared configuration as behavior: what it deploys, how parts are connected, what the launcher gets

### Requirement: Derivation Doesn't Set Sub-Agent Type Itself
Derivation prompt SHALL require taking sub-agent type from list that Task tool itself offers, and SHALL prohibit inventing a type name. If suitable agent doesn't exist or tool is unavailable, prompt SHALL instruct to analyze capabilities sequentially on its own, without retry attempts with guessed type.

#### Scenario: Agent Type Taken From Tool
- **WHEN** derivation prompt is assembled
- **THEN** it contains no specific agent type name and instructs to select a general type from the tool's own list

#### Scenario: No Suitable Agent
- **WHEN** Task tool is unavailable or doesn't offer a general agent
- **THEN** agent analyzes capabilities one by one itself and doesn't attempt to call Task with guessed type

### Requirement: Derivation Exits Without Questions Only On Truly Empty Project
Derivation prompt SHALL instruct on overview pass to exit remaining phases only when directory is empty or contains nothing besides README: confirming an empty capability list isn't necessary. Exit condition SHALL be worded so that a repository of configurations, manifests or scripts doesn't fall under it.

#### Scenario: Directory Is Empty
- **WHEN** project has nothing except README, or is empty
- **THEN** agent reports this and skips confirmation, detail and validation phases without asking about empty list

#### Scenario: Project Without Application Code Isn't Considered Empty
- **WHEN** project consists of configurations, manifests or scripts
- **THEN** exit doesn't trigger: agent assembles capability list from them and goes through all phases

### Requirement: Derivation Prompt Limits config.yaml Editing
Derivation prompt restrictions SHALL allow editing `openspec/config.yaml` where the prompt itself explicitly asks for it — otherwise checkpoint `plugin.init.done` contradicts write prohibition beyond `openspec/specs/`.

#### Scenario: Stage Checkpoint Doesn't Violate Restrictions
- **WHEN** initialization prompt asks to write `plugin.init.done` right after derivation block
- **THEN** derivation restrictions explicitly allow such edit, keeping prohibition on `openspec/changes/` and code
