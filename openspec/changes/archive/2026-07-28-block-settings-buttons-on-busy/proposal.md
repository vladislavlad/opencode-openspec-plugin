## Why

The "Check Versions" and "Reload" buttons in the Settings view are not gated by `busy`, so a user can trigger them while the agent is already running a turn. This can cause conflicting operations or lost state.

## What Changes

- Spread `{...props.gate}` on the "Check Versions" button in `settings.tsx` (line 84).
- Spread `{...props.gate}` on the "Reload" button in `settings.tsx` (line 97).

## Capabilities

### New Capabilities

### Modified Capabilities
- `update-flow`: The Check Versions and Reload buttons in Settings must be blocked while the agent is busy, consistent with all other action buttons (Update, Update All, Complete Update).

## Impact

- `src/components/settings.tsx` — two Button elements need `{...props.gate}` spread.

## Non-goals

- Not adding a new busy-gating mechanism; reusing the existing `Gate` type and `gate` prop already passed to `SettingsView`.
- Not addressing other views' buttons — only Settings in this change.
