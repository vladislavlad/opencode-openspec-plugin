## Why
OpenCode 2.4.1 ships a newer renderer and plugin loader. OpenSpec 2.2 installs
workflow skills in place of generated slash commands. Existing installations
also need a safe route from the V1 maintenance line to the V2 plugin.

## What Changes
- Target OpenCode 2.4.1 and separate the two npm channels.
- Load workflow skills for OpenSpec 2.2 sidebar actions.
- Document the required V1 plugin replacement and resume pending migration.

## Capabilities
- `plugin-lifecycle`, `openspec-parsing`, `prompt-sending`, `update-flow`.

## Impact
TUI package entrypoint, installer instructions, scoped command and skill catalogs,
Settings, generated OpenSpec tooling and release automation.

## Non-goals
- Port the sidebar to the OpenCode desktop interface.
- Rewrite existing OpenSpec specs or changes during host migration.
