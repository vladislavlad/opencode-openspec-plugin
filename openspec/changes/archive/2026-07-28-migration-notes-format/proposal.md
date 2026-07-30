## Why

The migration prompt that delivers release notes to the agent after an update renders them as a plain paragraph under each version heading. The user wants a structured format with a top-level "Release Notes" section and bullet-list items per version for readability.

## What Changes

- Add a `## Release Notes` heading before version-grouped notes in the migration prompt
- Format each release note item as a markdown bullet list (`- Item`) instead of joining them into a paragraph

## Capabilities

### New Capabilities

### Modified Capabilities
- `update-flow`: The migration prompt builder formats release notes with a section heading and bullet-list items per version.

## Impact

Affected code: `src/lib/migrations.ts` — the `buildMigrationPrompt` function that assembles the post-update prompt, and the `MIGRATIONS` table entries where `releaseNotes` are currently joined with `.join(" ")`.

## Non-goals

- Not changing how release notes are stored in the `MIGRATIONS` table (still an array of strings)
- Not affecting the agent's relay to the user — only the prompt structure sent to the agent
