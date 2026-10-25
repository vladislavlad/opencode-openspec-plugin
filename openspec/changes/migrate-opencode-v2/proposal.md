# OpenCode V2 plugin

## Why

OpenCode V2 cannot load the V1 TUI plugin. Version 2.0.0 must use the current CLI plugin API while preserving OpenSpec browsing, task progress, setup and update flows. V1 is preserved by local commit/tag `v1.0.0`.

## What Changes

- **BREAKING:** Target OpenCode 2.1.3 and OpenTUI 0.6.6 with `@opencode/plugin/tui`, `Plugin.define`, `setup`, `sidebar.content`, and `cli.json` / `plugins` configuration.
- Use V2 session locations, binary file reads, `running` status, semantic theme tokens and durable plugin storage.
- Register native argument-aware commands and dispose registrations with plugin lifetime.
- Replace draft insertion with an editable native command dialog; submit through V2 session APIs, preserve the main draft, recheck session identity/busy state, and show errors.
- Run Explore in Plan and all other plugin agent actions in Build, using the user-selected model and variant; show the execution settings in editable dialogs.
- Resolve configured OpenSpec command templates and submit their expanded text directly, so native agent/model/subagent settings cannot override the plugin's execution policy. Reject unsupported shell interpolation before changing session settings.
- Preserve project command symlinks to templates elsewhere in the project, and validate markdown definitions before selecting a source so invalid frontmatter never becomes an agent prompt.
- Refresh native commands and skills after setup through the server reload API instead of temporary V1 registrations.
- Ask for delegation mode before scanning and apply a per-run child limit through scanning and spec writing; default to parent-only work without an explicit usable answer.
- Remove permanent command help duplicated by dialogs and hide Update All when a single component update already covers the same action.
- Retain grouped specs, task hierarchy, search, busy deletion protection and setup/update markers; update installation instructions and 2.0.0 release notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-lifecycle`: V2 entrypoint, slots, cleanup and location-scoped file access.
- `sidebar-ui`: V2 polling, running guard, themes and editable actions.
- `slash-commands`: V2 layers and native string arguments.
- `prompt-sending`: command dialogs, direct session submission, errors and native exit.
- `init-flow`: native command reload after initialization.
- `update-flow`: CLI config format and durable V2 version history.
- `change-tracking-ui`: editable Apply/Update actions.
- `spec-derivation`: explicit delegation choice and bounded batches with sequential fallback.

## Non-goals

V1 compatibility within the 2.0.0 bundle, changes to OpenSpec's schema or main specs, archive, V2 commits/tags, remote push or publication. No provider credentials or paid model calls are needed for verification.

## Impact

Entrypoint, host-facing helpers, commands, sidebar, theme, update prompt, dependency lockfile, tests, README and AGENTS mapping. OpenSpec stays at 1.14.3. Existing user files are never migrated automatically by the plugin.
