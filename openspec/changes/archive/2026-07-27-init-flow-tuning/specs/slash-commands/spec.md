## ADDED Requirements

### Requirement: CONFIG_PROMPT – task granularity with two options
`CONFIG_PROMPT` SHALL offer exactly two levels of task breakdown – "High-level" and "Detailed" – and describe them by scope of work rather than execution time.

#### Scenario: Task question composition
- **WHEN** the user answered "Yes" to the "Configure detailed rules?" question
- **THEN** the "Tasks" question offers exactly two options: "High-level" with description "a few high-level tasks" and "Detailed" with description "sub-tasks grouped under high-level sections"

#### Scenario: Hints don't measure time
- **WHEN** the setup prompt is assembled
- **THEN** it doesn't contain "Coarse", "Medium", "Fine" options and doesn't describe tasks by duration ("~half-day", "~1-2h")

#### Scenario: Rule in config
- **WHEN** the user selected "High-level"
- **THEN** the rule "several large top-level tasks" is written to `rules.tasks`

#### Scenario: Rule in config for detailed breakdown
- **WHEN** the user selected "Detailed"
- **THEN** the rule "sub-tasks grouped by major sections" is written to `rules.tasks`

### Requirement: Derivation prompt asks about project exploration depth
The derivation prompt SHALL ask the user about code exploration depth – "Overview" or "Deep" – before it begins reading the project, warning about the cost of deep mode. The question SHALL be asked by the calling side, and the derivation body shall only follow the chosen depth without its own branching. The chosen depth SHALL determine both the overview pass that assembles the capability list and the sub-agent's work at the detail stage.

#### Scenario: Question is asked before reading code
- **WHEN** derivation is launched by `/opsx-baseline`
- **THEN** first a separate question about depth with "Overview" and "Deep" options is asked, and only after the answer does project overview begin

#### Scenario: In init, depth is asked together with consent to derive
- **WHEN** the initialization prompt reaches the derivation step
- **THEN** one `question` call offers "Yes – Overview", "Yes – Deep", and "No", and there's no separate depth question in the prompt

#### Scenario: Derivation body doesn't branch
- **WHEN** any of the prompts including derivation is assembled
- **THEN** the common part of derivation is one and the same and contains no conditional phrasings like "already answered above" – only the question asked by the calling side differs

#### Scenario: "Deep" doesn't mean "open every file"
- **WHEN** the user selected "Deep"
- **THEN** the prompt states that actual execution paths are read, and tests, fixtures, generated and vendored code are skipped at any depth

#### Scenario: Cost warning
- **WHEN** the "Deep" option is shown to the user
- **THEN** its description states that such analysis may take a lot of time and tokens

#### Scenario: Top-level breakdown
- **WHEN** "Overview" is selected
- **THEN** the capability list is assembled from README, folder structure, manifests, and entry points, and the sub-agent reads entry points and main modules of the capability without reading through all its files

#### Scenario: Deep breakdown
- **WHEN** "Deep" is selected
- **THEN** the capability list is assembled after reading code for each area rather than from folder layout, and the sub-agent walks execution paths of the capability from start to finish, including error handling and edge cases, recording them as separate scenarios

### Requirement: Derivation looks for capabilities in any kind of project
The derivation prompt SHALL name what exactly counts as a capability: what the project provides its user, integrations and external systems it depends on, and behavior it implements itself rather than taking from a library. The prompt SHALL explicitly state that a project doesn't have to be an application: in an infrastructure, configuration, or tooling repository, the described behavior is the declared configuration itself.

#### Scenario: What to look for is named explicitly
- **WHEN** the derivation prompt is assembled
- **THEN** it lists all three types of capabilities without illustrative examples and doesn't restate stack and architecture – they're already described in `openspec/config.yaml` and AGENTS.md

#### Scenario: Repository without application code
- **WHEN** the project consists of configurations, manifests, or scripts and contains no application code
- **THEN** the prompt instructs to describe declared configuration as behavior: what it deploys, how parts are connected, what the launcher gets

### Requirement: Final init section removes marker without extra validation
The final section of the initialization prompt SHALL remove the setup marker in all cases except one – spec validation is still failing after fixes. Re-validation SHALL be skipped when it was already performed by a derivation step or when there are no specs in the project. The instruction about the marker's fate SHALL sit at the stop itself: the installation step when `openspec init` fails directly tells you to leave config.yaml with the marker for Resume. The invitation to work SHALL sound only after the marker is removed, and SHALL begin with a message that OpenSpec is configured.

#### Scenario: Empty project
- **WHEN** derivation wasn't run or didn't produce specs
- **THEN** validation is skipped and the marker is still removed – the sidebar doesn't remain in an unfinished setup state

#### Scenario: Same finale for any successful outcome
- **WHEN** the marker is removed – specs derived, derivation declined, or there was nothing to derive
- **THEN** the finale is one and the same: a message that OpenSpec is configured and ready, then two sidebar buttons – **Explore** and **Propose** – and their equivalent commands `/opsx-explore` and `/opsx-propose`

#### Scenario: Derivation didn't fully cover the project
- **WHEN** the final section reaches the greeting
- **THEN** it mentions `/opsx-baseline` as a way to supplement specs: a re-run refines and expands existing ones rather than duplicating them

#### Scenario: Derivation already validated
- **WHEN** the derivation step completed with an `openspec validate --specs` run in this same turn
- **THEN** the final section doesn't launch validation again

#### Scenario: Validation fails
- **WHEN** after fixes, `openspec validate --specs` still reports errors
- **THEN** the `init:` block remains in config.yaml, the agent reports what exactly is broken, and doesn't invite to Explore/Propose

#### Scenario: After CLI installation cancellation, final section isn't executed
- **WHEN** the user selected "Cancel" on the package manager question
- **THEN** the turn ends at the installation step – the marker is already removed by cleanup of that step itself

#### Scenario: Finale assembles for enabled stages
- **WHEN** the prompt is assembled without an installation step or without a derivation step
- **THEN** the final section doesn't mention absent steps: neither installation stops, nor "No" answer to derivation, nor already performed validation

#### Scenario: Failed openspec init leaves marker
- **WHEN** `openspec init` ended with an error
- **THEN** the turn stops with an error message, and the installation step itself tells you to leave config.yaml with the marker – the sidebar will offer Resume

### Requirement: CLI installation cancellation cleans up by a checkable rule
The initialization prompt SHALL describe cleanup after CLI installation cancellation in mechanically checkable steps without requiring the agent to know what existed before the turn began.

#### Scenario: Cleanup after cancellation
- **WHEN** the user selected "Cancel" on the package manager question
- **THEN** the agent removes the `init:` block; deletes `openspec/config.yaml` only if nothing remains in it besides `schema`; deletes the `openspec/` directory only if it turned out empty

#### Scenario: Someone else's config stays in place
- **WHEN** `openspec/config.yaml` already had `context` or `rules` before the turn began
- **THEN** after cancellation, the file remains with that content, minus only the `init:` block

### Requirement: Setup step inside init doesn't check for openspec presence
The setup prompt SHALL be assembled in two forms: the separate `/opsx-config` command checks for the `openspec/` directory and stops if it's absent, while the setup step inside the initialization prompt contains no such check.

#### Scenario: Separate command
- **WHEN** a prompt is assembled for `/opsx-config`
- **THEN** it contains an instruction to report the need for initialization and stop if the `openspec/` directory doesn't exist

#### Scenario: Step inside init
- **WHEN** the setup step is assembled as part of the initialization prompt
- **THEN** this check isn't in it – installation higher up in the same prompt just created `openspec/`

### Requirement: Prompts speak to the user in their language, preserving terms
Each prompt that addresses the user – asks questions or relays something to them – SHALL instruct dialogue in the language the user writes in, and SHALL forbid transliteration of OpenSpec terms (proposal, change, spec, requirement, scenario, task), keeping them in English. The instruction SHALL appear once in the prompt rather than repeating with each nested stage.

#### Scenario: Dialogue in user's language
- **WHEN** any of the prompts that ask questions is assembled: `/opsx-config`, `/opsx-baseline`, initialization or its fallback variant
- **THEN** it contains an instruction to write questions, options, and summaries in the user's language and not transliterate OpenSpec terms

#### Scenario: Release notes relay
- **WHEN** the update completion prompt is assembled, instructing to relay release notes to the user
- **THEN** it contains the same instruction – relay in user's language, OpenSpec terms without transliteration

#### Scenario: Instruction isn't duplicated
- **WHEN** the initialization prompt embeds setup and derivation steps within itself
- **THEN** the dialogue language instruction appears exactly once

### Requirement: Multi-select is set by instruction, not a remark
Prompts SHALL require enabled multi-select as a separate instruction for each question where it's needed: capability list confirmation, "Stack", and "Context". The phrasing SHALL directly state that the user must be able to select multiple options at once.

#### Scenario: Capability list confirmation
- **WHEN** the derivation prompt is assembled
- **THEN** the confirmation phase contains an instruction to enable multi-select rather than a mention of "multi-select" in parentheses

#### Scenario: Setup questions
- **WHEN** the setup prompt is assembled
- **THEN** it on a separate line requires enabled multi-select for "Stack" and "Context"

#### Scenario: Question about found capabilities
- **WHEN** the confirmation phase asks its question
- **THEN** it asks which of the listed capabilities to write specs for, rather than what additional capabilities to add

### Requirement: Derivation doesn't set sub-agent type itself
The derivation prompt SHALL require taking the sub-agent type from the list offered by the Task tool itself, and SHALL forbid making up a type name. If no suitable agent exists or the tool is unavailable, the prompt SHALL instruct to break down capabilities sequentially on your own without retry attempts with a guessed type.

#### Scenario: Agent type comes from the tool
- **WHEN** the derivation prompt is assembled
- **THEN** it doesn't contain a specific agent type name and tells you to choose a general type from the tool's own list

#### Scenario: No suitable agent
- **WHEN** the Task tool is unavailable or doesn't offer a general agent
- **THEN** the agent breaks down capabilities one by one itself and doesn't attempt to call Task with a guessed type

### Requirement: Derivation exits without questions only on truly empty projects
The derivation prompt SHALL instruct an exit from remaining phases during the overview pass only when the directory is empty or contains nothing besides README: there's no point confirming an empty capability list. The exit condition SHALL be formulated so that a repository of configurations, manifests, or scripts doesn't fall under it.

#### Scenario: Directory is empty
- **WHEN** the project has nothing but README, or is empty
- **THEN** the agent reports this and skips confirmation, detail, and validation phases without asking questions on an empty list

#### Scenario: Project without application code isn't considered empty
- **WHEN** the project consists of configurations, manifests, or scripts
- **THEN** exit doesn't trigger: the agent assembles a capability list from them and goes through all phases

### Requirement: Derivation prompt limits config.yaml editing
Derivation prompt constraints SHALL allow editing `openspec/config.yaml` where the prompt itself directly asks for it – otherwise the `plugin.init.done` checkpoint contradicts the write prohibition beyond `openspec/specs/`.

#### Scenario: Stage checkpoint doesn't violate constraints
- **WHEN** the initialization prompt asks to write `plugin.init.done` right after the derivation block
- **THEN** derivation constraints explicitly allow such editing, keeping the prohibition on `openspec/changes/` and code

## MODIFIED Requirements

### Requirement: Initialization prompt manages setup marker
The initialization prompt SHALL ensure the presence of marker `plugin.init.in-progress: true` in `openspec/config.yaml` before CLI installation and instruct the agent to remove the entire `init:` block only after successful validation. The marker write step SHALL be assembled based on whether the sidebar itself wrote the marker, and SHALL separate two cases – file already exists and file doesn't exist.

#### Scenario: Marker already written by sidebar
- **WHEN** the prompt is assembled with a flag that the sidebar set the marker
- **THEN** the first step only states that the `plugin.init` block already exists and should be left as is, and the YAML write instruction doesn't enter the prompt

#### Scenario: Configuration file already exists
- **WHEN** the prompt is assembled without this flag, but `openspec/config.yaml` exists in the project
- **THEN** the agent is told to add the `plugin.init` block and not change anything else in the file – including not overwriting `schema`

#### Scenario: Configuration file doesn't exist
- **WHEN** the prompt is assembled without this flag and `openspec/config.yaml` is absent
- **THEN** the agent is told to create the file along with the `openspec/` directory, writing `schema: spec-driven` and the `plugin.init` block

#### Scenario: Step order doesn't change
- **WHEN** the prompt is assembled either way
- **THEN** the remaining preflight steps and their numbering are identical, and the marker ends up in place before CLI installation in both cases

#### Scenario: Marker removal after validation
- **WHEN** setup is complete and `openspec validate --specs` passes
- **THEN** the agent removes the entire `init:` block under `plugin:`, preserving `schema`, `context`, `rules`, and other `plugin:` entries

#### Scenario: Validation doesn't pass
- **WHEN** after fixes, validation still doesn't pass
- **THEN** the `init:` block remains in config.yaml so the sidebar can offer to continue

#### Scenario: Marker removal on derivation decline
- **WHEN** the user declined to derive specs or the project turned out empty
- **THEN** the agent still reaches the final section and removes the marker

#### Scenario: Setup interruption
- **WHEN** the agent's turn is interrupted before setup completion
- **THEN** the marker remains in config.yaml and serves as a sign of unfinished setup

### Requirement: /opsx-baseline command registration
The system SHALL register the slash command `/opsx-baseline` in the `palette` namespace with name `openspec.baseline`, category `OpenSpec`, and prompt `SPEC_BASELINE_PROMPT`. The command description SHALL match what the prompt actually does: it doesn't perform setup but requires it beforehand.

#### Scenario: Successful baseline registration
- **WHEN** the function `registerCommands` is called with a valid API
- **THEN** the `/opsx-baseline` command is available in the palette with title "OpenSpec: Baseline specs from code" and description "Derive or refresh openspec/specs from the existing implementation (needs a configured project)"
