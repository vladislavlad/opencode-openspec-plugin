## Purpose
Utility for clearing, appending text to, and submitting prompts in the TUI input field via plugin API.

## Requirements

### Requirement: Appending Text To Prompt
The system SHALL append specified text to the TUI prompt input field using `appendPrompt`.

#### Scenario: Basic Text Append
- **WHEN** `sendPrompt` is called with text and no options
- **THEN** text is appended to current prompt via `api.client.tui.appendPrompt`

### Requirement: Clearing Prompt Before Appending
The system SHALL clear the prompt input field if `clear` flag is specified.

#### Scenario: Clear Enabled
- **WHEN** `sendPrompt` is called with option `{ clear: true }`
- **THEN** system calls `api.client.tui.clearPrompt` before appending text

### Requirement: Submitting Prompt After Appending
The system SHALL submit the prompt if `submit` flag is specified.

#### Scenario: Submit Enabled
- **WHEN** `sendPrompt` is called with option `{ submit: true }`
- **THEN** system calls `api.client.tui.submitPrompt` after appending text

### Requirement: Using Directory From API State
The system SHALL use directory from `api.state.path.directory` for all TUI calls.

#### Scenario: Directory Passed To Every Call
- **WHEN** `sendPrompt` is called with any set of options
- **THEN** `directory` parameter is taken from `api.state.path.directory` and passed to every TUI API call

### Requirement: Silent Execution On TUI Rejection
The system SHALL silently ignore errors that occur during prompt submission.

#### Scenario: TUI Rejects Request
- **WHEN** any of `clearPrompt`, `appendPrompt` or `submitPrompt` throws an error
- **THEN** error is caught and function completes without re-throwing exception

### Requirement: Sending Text As Agent Turn
The system SHALL provide `submitPrompt`, which sends text as an agent turn with prior input field clearing.

#### Scenario: Launching Slash Command
- **WHEN** `submitPrompt` is called with command text (e.g., `/opsx-archive <name>`)
- **THEN** `sendPrompt` is called with options `{ clear: true, submit: true }` — the command executes as a regular agent turn with current session's agent/model

#### Scenario: Clearing Before Submit Is Mandatory
- **WHEN** user's unfinished text remains in input field
- **THEN** it is erased before appending submitted text, not concatenated with it

### Requirement: Closing Opencode
The system SHALL provide `quitOpencode`, which closes opencode by sending `exit` command to prompt, so that commands and skills are re-read on next launch.

#### Scenario: Close By Sending Exit
- **WHEN** `quitOpencode` is called
- **THEN** prompt is cleared, `exit` is appended, and submission is executed

#### Scenario: Native Dispatch Not Used
- **WHEN** `quitOpencode` is called
- **THEN** `api.keymap.dispatchCommand("app.exit")` is not executed — synchronous exit interrupted rendering and left an escape sequence fragment in terminal
