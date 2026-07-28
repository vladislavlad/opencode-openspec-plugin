## MODIFIED Requirements

### Requirement: Post-update completion prompt
The post-update completion prompt SHALL consist of sequential stages, each delimited by `---` separators before and after the block. The context stage SHALL name the version range and notify about restart (without separators). The migration stage SHALL begin with an imperative instruction "execute these steps" and list `instructions` by version; if there are no steps – the stage is skipped entirely. The flag-clearing stage SHALL be present only when the range came from `plugin.update-in-progress` and contain an instruction to remove the block while preserving the rest of config.yaml content. The release notes stage SHALL begin with an instruction "tell the user about what's new" and list release notes by version. Each stage (migration, flag-clearing, release notes) SHALL be delimited by `---` before and after the block. The agent SHALL execute migration and flag-clearing stages silently and include only the release notes stage in its response to the user.

#### Scenario: Steps exist in range
- **WHEN** at least one record in the range has non-empty `instructions`
- **THEN** prompt contains a migration stage with imperative heading, steps by version, and `---` separators before and after the block

#### Scenario: No steps, only release notes
- **WHEN** all records in the range have empty `instructions`
- **THEN** migration stage is skipped entirely, prompt proceeds to the next stage

#### Scenario: Range from flag
- **WHEN** range was obtained from `plugin.update-in-progress`
- **THEN** prompt contains a separate stage with instruction to remove block `plugin.update-in-progress`, preserving rest of config.yaml content, delimited by `---` separators

#### Scenario: Agent does not relay actions
- **WHEN** agent receives a prompt with separated stages and delimiters
- **THEN** agent executes migration and flag-clearing silently, and passes only the summary from release notes to the user
