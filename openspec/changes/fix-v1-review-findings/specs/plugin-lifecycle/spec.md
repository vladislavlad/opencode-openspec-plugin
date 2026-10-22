## ADDED Requirements

### Requirement: Deletion Requires An Idle Session
The deletion helper SHALL require an idle-check callback from its caller. It SHALL check before resolving the local project directory, after that asynchronous lookup, and before filling a fallback prompt. A rejected check SHALL leave files and prompt unchanged and notify through the caller's existing busy feedback.

#### Scenario: Busy At Invocation
- **WHEN** deletion is requested while the session is busy or retrying
- **THEN** no filesystem deletion or fallback prompt occurs

#### Scenario: Busy During Directory Lookup
- **WHEN** deletion starts idle but the idle check fails after resolving the local project directory
- **THEN** the change folder remains and no fallback prompt is inserted

#### Scenario: Idle Local Deletion
- **WHEN** the session remains idle and the change directory is local
- **THEN** deletion removes the directory and does not send a fallback prompt

#### Scenario: Idle Remote Fallback
- **WHEN** the session remains idle and the local directory is unavailable
- **THEN** the existing deletion request is inserted into the prompt
