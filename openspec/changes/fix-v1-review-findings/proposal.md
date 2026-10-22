# Fix V1 review findings

## Why

The V1 review reproduced four existing defects: a deletion confirmation can remain actionable while the agent is busy, registered commands lose arguments and bypass the busy gate, and CRLF task files lose their section headings. Fix these before releasing the V1 compatibility update as 1.0.0.

## What Changes

- Block confirmed deletion while the current session is busy or retrying, including a check at the deletion boundary.
- Read command arguments from the real OpenCode V1 command context.
- Reject registered command execution before clearing or changing the prompt when the current session is busy or retrying.
- Preserve task groups and reset nesting at headings in CRLF files.
- Cover each finding with a regression test and include the fixes in the unreleased 1.0.0 release notes.
- Set the plugin to 1.0.0 for OpenCode V1 and reserve 2.0.0 for OpenCode V2, per the user's versioning decision.
- Gate release publishing on a matching version tag, lint, types, tests and OpenSpec change validation; inspect the package contents before publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-tracking-ui`: deletion confirmation follows the live busy gate.
- `plugin-lifecycle`: deletion checks session availability before local removal or agent fallback.
- `slash-commands`: commands preserve arguments and reject execution during active turns.
- `openspec-parsing`: CRLF task headings retain their groups and nesting boundaries.

## Non-goals

- OpenCode V2 support, additional features, or unrelated refactoring.
- Main-spec synchronization, archive or publishing. The user subsequently authorized the V1 commit and local v1.0.0 tag; V2 work stays uncommitted.
- Replacing or discarding the existing uncommitted V1 compatibility work.

## Impact

Command registration, change deletion and confirmation, task parsing, regression tests and 1.0.0 release notes. Add the V1 keymap package as a pinned development dependency so tests and types use the actual dispatcher contract. Runtime libraries remain external to the plugin bundle.
