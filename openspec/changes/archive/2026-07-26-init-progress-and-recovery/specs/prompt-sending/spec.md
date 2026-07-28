## MODIFIED Requirements

### Requirement: Closing opencode
The system SHALL provide `quitOpencode`, which closes opencode by sending the `exit` command in a prompt, so that on next launch commands and skills are re-read.

#### Scenario: Closing via exit send
- **WHEN** `quitOpencode` is called
- **THEN** the prompt is cleared, `exit` is added to it, and the send is executed

#### Scenario: Native dispatch not used
- **WHEN** `quitOpencode` is called
- **THEN** `api.keymap.dispatchCommand("app.exit")` is not executed – synchronous exit interrupted rendering and left an escape-sequence fragment in the terminal
