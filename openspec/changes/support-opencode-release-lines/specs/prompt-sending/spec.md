## ADDED Requirements

### Requirement: OpenSpec skill workflow actions
The sidebar SHALL preserve a configured legacy OpenSpec command and use the corresponding OpenSpec workflow skill when the command is absent and the skill is available.

#### Scenario: A project only has OpenSpec 2.2 skills
- **WHEN** the user runs a sidebar action and the host has the matching workflow skill
- **THEN** the sidebar sends a request for that skill with the user's arguments
