## Why
OpenCode 1 users need compatible patch releases and working OpenSpec 2.2
workflows. Users moving to OpenCode 2 need an actionable notice.

## What Changes
- Publish 1.x maintenance updates on npm latest.
- Use OpenSpec 2.2 workflow skills in the V1 sidebar.
- Show the required plugin version and dedicated npm package when OpenCode 2 loads the V1 package.

## Capabilities
- `plugin-lifecycle`, `openspec-parsing`, `prompt-sending`, `update-flow`.

## Impact
V1 TUI entrypoint, version checks, Settings, workflow dispatch and release automation.

## Non-goals
- Register V1 sidebar actions in an OpenCode 2 host.
- Move project files or rewrite global user configuration on startup.
