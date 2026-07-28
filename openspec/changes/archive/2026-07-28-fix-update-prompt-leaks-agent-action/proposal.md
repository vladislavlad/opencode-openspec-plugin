## Why

The post-update prompt sent to the agent mixes user-facing release notes with an agent-only cleanup instruction ("remove plugin.update-in-progress block from config.yaml"). The agent treats everything as content to relay and echoes the cleanup instruction back to the user in its summary, which is confusing.

## What Changes

- Restructure `buildMigrationPrompt` into explicit stages separated by `---`:
  1. Context — version range + restart notice (no separators)
  2. Migration steps — imperative header + instructions grouped by version (or "no steps"), wrapped with `---` before and after
  3. Clear flag — instruction to remove `plugin.update-in-progress`, wrapped with `---` before and after (only when range came from the flag)
  4. Release notes — imperative header + notes grouped by version, wrapped with `---` before and after

- Each block is delimited so the agent distinguishes between actions to execute silently and content to relay to the user.

## Capabilities

### New Capabilities

### Modified Capabilities
- `update-flow`: The migration prompt must use staged sections separated by `---` so the agent distinguishes between private actions and relayable content.

## Impact

- `src/lib/migrations.ts` — `buildMigrationPrompt` function, full restructuring of output order and section delimiters

## Non-goals

- Not reworking the entire migration system or how release notes are authored.
- Not adding new agent parsing rules — just making each stage's purpose explicit with separators and imperative headers.
