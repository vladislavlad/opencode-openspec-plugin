## Why

The user cannot see the OpenSpec plugin version and has no access to settings from the interface. We need to display the version on hover over the header and add a Settings button to open the settings screen.

## What Changes

- On hover over the header row, show the plugin version (e.g., `0.2.0`, color `textMuted`)
- Add a Settings button on the right in the header next to "OpenSpec", color `warn`
- Clicking Settings opens the Settings view displaying the plugin version and a "← back" button

## Capabilities

### New Capabilities
- `settings-view`: Plugin settings screen with back navigation, displaying the version and reserved for future settings.

### Modified Capabilities
- `sidebar-ui`: The sidebar header gains a hover version hint and a Settings button on the right.

## Non-goals

- We don't add other settings in the first pass – only the version as a placeholder.
- We don't change navigation structure for existing views (changes, specs).

## Impact

- `src/sidebar.tsx`: Modify header and add signal/routing for Settings view.
- `src/components/settings.tsx`: New SettingsView component.
- `build.ts`: Add `define` to bake version at build time.
- `src/lib/version.ts`: Version constant with fallback to `"dev"`.
