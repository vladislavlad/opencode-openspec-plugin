## Context

The sidebar and prompt transport share a helper that reads the main session's foreground status. OpenCode 2.4.1 also exposes running jobs scoped to a session and its descendants. Subagent results arrive through the parent's inbox before the parent continues processing them.

## Decisions

- Use the host's existing job state for running subagents and the parent inbox for results awaiting delivery. Consider only subagent jobs in that session tree. An inbox entry older than the last idle boundary does not keep actions locked.
- Keep the progress indicator visible if the sidebar mounts into a session with an active setup marker and ongoing work.
- Refresh the setup marker once the session becomes idle before deciding whether to offer Resume. Reuse the sidebar's existing poll and action guard.

## Risks

- A subagent can run for an extended period. Its actual status controls the guard so setup cannot be restarted while that subagent writes specs.
