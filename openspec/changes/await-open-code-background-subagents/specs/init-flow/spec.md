## ADDED Requirements

### Requirement: Setup Activity Includes Background Subagents

The sidebar SHALL treat setup as active while its OpenCode session is running, a subagent in its session tree is running, or a recent subagent result is awaiting delivery in the parent session.

#### Scenario: Parent Is Idle With Subagents Running

- **WHEN** setup is in progress and the parent session goes idle with at least one running subagent in its session tree
- **THEN** the sidebar retains the setup progress indicator and withholds Resume and Dismiss

#### Scenario: Final Subagent Hands Off to Parent

- **WHEN** the final running subagent has finished and its result is awaiting delivery to the parent session
- **THEN** the sidebar keeps setup active until the parent processes the result or reaches a subsequent idle boundary

#### Scenario: Session Settles With an Incomplete Marker

- **WHEN** foreground work, subagents and result delivery have settled and a fresh read finds the setup marker with the tooling checkpoint
- **THEN** the sidebar shows Resume and Dismiss for the first unfinished stage

#### Scenario: Session Settles With Setup Complete

- **WHEN** foreground work, subagents and result delivery have settled and a fresh read finds no setup marker
- **THEN** the sidebar clears the progress indicator and continues without showing the incomplete setup banner

#### Scenario: Sidebar Remounts During Background Work

- **WHEN** the sidebar mounts with an existing setup marker while its session tree has a running subagent
- **THEN** the sidebar shows setup progress and keeps recovery actions unavailable
