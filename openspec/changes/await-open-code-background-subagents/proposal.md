## Why

OpenCode 2 can leave the main session idle while its background subagents are still deriving specs. The sidebar treats that idle state as an interrupted setup and exposes Resume and Dismiss while the existing run is still writing files.

## What Changes

- Keep the setup progress indicator and action guards active while a subagent in the session's tree is running or delivering a result to the parent.
- Check the setup marker after the main session and its subagents settle, then show recovery actions only if the marker remains.

## Non-goals

- Change how OpenCode schedules subagents or starts the next batch.
- Change how OpenSpec derives, validates, or checkpoints specs.

## Capabilities

### Modified Capabilities

- `init-flow` accounts for background work when showing progress and deciding whether setup stopped.

## Impact

- OpenCode 2 TUI session and background-job state, sidebar setup handling, and regression tests.
