## MODIFIED Requirements

### Requirement: Clearing Input And Submitting Prompt
When the current session is idle, the system SHALL clear input and automatically submit the bound prompt for any registered command. String arguments supplied in the OpenCode V1 Keymap context's `payload` SHALL be trimmed and appended as `Arguments: <text>`. Missing, blank or non-string payloads SHALL leave the template unchanged; key input and palette filter text SHALL NOT become arguments.

#### Scenario: Executing /opsx-config Command
- **WHEN** the user selects `/opsx-config` from the palette while idle without a payload
- **THEN** input text is cleared, and `CONFIG_PROMPT` content is sent to the model

#### Scenario: Executing /opsx-baseline Command
- **WHEN** the user selects `/opsx-baseline` from the palette while idle without a payload
- **THEN** input text is cleared, and `SPEC_BASELINE_PROMPT` content is sent to the model

#### Scenario: Passing Arguments
- **WHEN** a caller dispatches a registered command with a string payload such as a change name
- **THEN** the trimmed payload is appended to the prompt as command arguments

#### Scenario: No Usable Arguments
- **WHEN** the command context has an empty, absent or non-string payload
- **THEN** only the bound template is submitted without an Arguments section

## ADDED Requirements

### Requirement: Command Busy Guard
Every plugin-registered prompt command, including temporary filesystem commands, SHALL check the current routed session at execution. Busy or retrying sessions SHALL receive the existing wait toast without clearing, appending or submitting prompt text. Home-screen invocation without a session SHALL remain available.

#### Scenario: Busy Or Retrying Session
- **WHEN** a registered command is invoked with the current session busy or retrying
- **THEN** the wait toast appears and the prompt remains unchanged with no submission

#### Scenario: Current Session Changes After Registration
- **WHEN** the user navigates to another session after commands are registered and invokes a command
- **THEN** the guard uses that session's current status

#### Scenario: Idle Or Home Invocation
- **WHEN** the current session is idle or the route is home without a session
- **THEN** the command clears input, appends its template and optional arguments, and submits once
