## Why

OpenSpec 2.2 omits release stamps in generated skills. Settings has no version to display even after Refresh OpenSpec confirms the project's tooling matches the installed CLI.

## What Changes

- Record the CLI version that successfully initialized or refreshed the project's OpenSpec tooling.
- Show that verified version in Settings as soon as the project state is read.
- Use the native catalog reload for CLI-only refreshes. Keep the restart prompt for plugin updates.
- Build the package before running release tests that resolve its TUI entrypoint.

## Non-goals

- Probe a CLI binary from the plugin process or infer its version from npm.
- Replace the existing `v2.0.0` tag or npm release.

## Capabilities

### Modified Capabilities

- `update-flow` uses verified tooling information and refreshes it from the project.

## Impact

Settings, setup and refresh prompts, the plugin section of `openspec/config.yaml`, and the release workflow.
