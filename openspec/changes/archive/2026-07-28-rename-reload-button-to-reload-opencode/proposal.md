## Why

The Settings view labels its reload button "Reload" while the init-flow banner uses "Reload OpenCode". Inconsistent naming across the sidebar is confusing — both buttons do the same thing (reopen opencode).

## What Changes

- Rename the Settings reload button from "Reload" to "Reload OpenCode" for consistency with `EphemeralReloadBanner`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `sidebar-ui`: Button labels must be consistent — every reload action uses "Reload OpenCode".

## Impact

- `src/components/settings.tsx` — one label change on the Reload button

## Non-goals

- Not renaming other buttons or reworking the sidebar layout.
- Not changing the `EphemeralReloadBanner` — it already has the correct label.
