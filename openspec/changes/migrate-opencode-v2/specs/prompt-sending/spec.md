## REMOVED Requirements

### Requirement: Appending Text To Prompt
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Editable Command Dialog in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: Editable Command Dialog
Former draft-insertion actions SHALL open the native V2 editable prompt dialog with the requested command as its initial value. They SHALL preserve the main composer draft and display the execution agent, provider/model and variant (including the model default). The shown model SHALL be captured when opening the dialog and used for the confirmed request. Cancellation SHALL NOT mutate session agent/model settings.

#### Scenario: Basic Text Append
- **WHEN** sendPrompt is called without immediate submission
- **THEN** the user can edit the command and confirm or cancel


## REMOVED Requirements

### Requirement: Clearing Prompt Before Appending
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Composer Draft Preservation in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: Composer Draft Preservation
The plugin SHALL no longer clear the host composer when preparing an OpenSpec request.

#### Scenario: Draft Exists
- **WHEN** the user has an unfinished composer draft
- **THEN** opening or running an OpenSpec action leaves that draft intact


## REMOVED Requirements

### Requirement: Submitting Prompt After Appending
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use V2 Session Submission in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: V2 Session Submission
Confirmed dialogs and immediate submitPrompt calls SHALL use V2 session.prompt. OpenSpec slash actions SHALL resolve their template through server reads, expand arguments and submit only text; native agent/model/subagent/subtask metadata SHALL NOT affect execution. Resolution SHALL follow native configuration precedence across document and markdown commands, without temporary registration or configuration writes.

#### Scenario: Submit Enabled
- **WHEN** submitPrompt is called with an OpenSpec slash command
- **THEN** the resolved template with its argument text is passed to session.prompt after the action's agent and selected model are committed

#### Scenario: Text Template
- **WHEN** submitPrompt receives a template
- **THEN** session.prompt receives that text

#### Scenario: Native Execution Overrides
- **WHEN** an Apply template configures Plan, another model or a subagent, or Explore configures Build
- **THEN** the template runs in the intended session with the plugin's Plan/Build policy and captured model/variant, and no native command executor is invoked

#### Scenario: Template Arguments
- **WHEN** a configured template contains $ARGUMENTS or numbered placeholders
- **THEN** argument substitution follows V2 text expansion, including quoted arguments and the remaining arguments at the highest numbered placeholder; without placeholders nonempty arguments are appended

#### Scenario: Unsupported Or Unavailable Template
- **WHEN** a template cannot be read or resolved, is empty, or its expanded text contains shell interpolation
- **THEN** an actionable error is shown before session creation or selection, no request is sent and no unsafe native fallback is attempted; the plugin never executes shell interpolation

#### Scenario: Session Changes During Template Resolution
- **WHEN** route, location or running state changes while resolving the template
- **THEN** no session settings are changed and no request is submitted

### Requirement: Command Definition Selection
Project command reads SHALL retain the captured project filesystem scope, including symlinks to templates outside `.opencode` but inside the project. Markdown definitions SHALL pass OpenCode-compatible frontmatter parsing and field validation before source selection. Invalid definitions SHALL be skipped using native source precedence, without executing their body. Valid execution metadata SHALL still be ignored when submitting the selected text.

#### Scenario: Project Symlink Overrides Global Template
- **WHEN** a project command links to a template elsewhere in that project and a global command has the same name
- **THEN** the project template and arguments are submitted with the action's Plan/Build agent and captured model/variant

#### Scenario: Invalid Project Definition
- **WHEN** project frontmatter has malformed YAML or invalid command fields and a valid lower-priority definition exists
- **THEN** that valid definition is selected, matching OpenCode; the invalid file's body is never submitted

#### Scenario: No Valid Definition
- **WHEN** every matching definition is invalid or absent
- **THEN** resolution fails visibly before session mutation and sends no prompt

#### Scenario: Native Frontmatter Syntax
- **WHEN** a valid command uses empty frontmatter, quoted or multiline YAML, or an unquoted colon accepted by OpenCode's sanitizing retry
- **THEN** parsing preserves its template body and configured source precedence

#### Scenario: Executable Frontmatter
- **WHEN** a file declares JavaScript frontmatter
- **THEN** it is rejected without evaluating code in the TUI process


## REMOVED Requirements

### Requirement: Using Directory From API State
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Session-bound Requests in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: Session-bound Requests
The plugin SHALL capture the intended route/session and location before an asynchronous action. A changed route or running session SHALL prevent subsequent preparation or submission after each asynchronous dialog, session creation or agent/model selection step.

#### Scenario: Session Changes During Dialog
- **WHEN** the user switches sessions before confirming
- **THEN** no request is sent to either session and feedback explains why


## REMOVED Requirements

### Requirement: Silent Execution On TUI Rejection
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Visible Submission Errors in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: Visible Submission Errors
V2 submission errors SHALL be caught and shown as an error toast instead of being silently swallowed.

#### Scenario: Server Rejects Request
- **WHEN** command or prompt submission rejects
- **THEN** an actionable error is shown and no unhandled rejection escapes


## REMOVED Requirements

### Requirement: Sending Text As Agent Turn
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use V2 Agent Turns in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: V2 Agent Turns
submitPrompt SHALL send one request to the intended idle session while preserving the main draft. Explore (`/opsx-explore`) SHALL select Plan; all other plugin agent actions SHALL select Build. The plugin SHALL capture the user-selected model and variant, await session agent and model selection before submission, and never automatically restore the previous agent after sending. Concurrent plugin submissions SHALL be rejected throughout preparation and dispatch.

#### Scenario: Launching Slash Command
- **WHEN** an immediate OpenSpec slash action is requested while idle
- **THEN** its expanded template executes in the current session through session.prompt

#### Scenario: Home Invocation
- **WHEN** a plugin command runs from home
- **THEN** a session is created at the current location with the action's explicit agent and the captured user-selected model/variant, then opened and used for the request

#### Scenario: Duplicate Pending Submission
- **WHEN** another plugin request is pending
- **THEN** a second invocation sends nothing and shows wait feedback


#### Scenario: Explore In An Existing Session
- **WHEN** Explore is confirmed while the saved session uses Build and an older model
- **THEN** Plan is selected, the model/variant shown in the dialog is committed, and the resolved command text is sent in that order

#### Scenario: Write Actions From Plan
- **WHEN** Init, Apply, Propose, Update, Archive, Config, Baseline or an agent-mediated filesystem fallback runs while the session uses Plan
- **THEN** Build and the captured user-selected model/variant are committed before the request

#### Scenario: Agent Changes While Editing
- **WHEN** the edited command requires a different agent than the dialog showed
- **THEN** the dialog opens again with the edited text and new agent, and nothing is submitted before confirmation of those settings

#### Scenario: No Model Selected
- **WHEN** the host has no selected model
- **THEN** guidance asks the user to select one and no session is created or mutated and no request is sent

#### Scenario: Selection Fails
- **WHEN** selecting the session agent or model fails
- **THEN** an error is shown, no command or prompt is submitted, and a later retry is allowed


## REMOVED Requirements

### Requirement: Closing Opencode
**Reason**: The V2 host replaces this V1-specific contract.
**Migration**: Use Deferred Native Exit in plugin 2.0.0; V1 remains on plugin 1.0.0.

## ADDED Requirements

### Requirement: Deferred Native Exit
quitOpencode SHALL defer native app.exit dispatch until after the current UI event.

#### Scenario: Deferred Exit
- **WHEN** an idle user selects Reload OpenCode
- **THEN** native app.exit is dispatched asynchronously and no model message is submitted
