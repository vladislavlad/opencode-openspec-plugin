## Why

The PostUpdateBanner shows "Reopen opencode to finish updating..." as plain text with no button — forcing the user to manually restart opencode from outside the sidebar. Every other reload path (`EphemeralReloadBanner`, Settings) provides a button, so this is an inconsistent UX gap.

## What Changes

- Add a "Reopen OpenCode" button below the reopen message in `PostUpdateBanner`.
- Wire the button to call `quitOpencode(props.api)` via a new `onReopen` prop from sidebar.

## Capabilities

### New Capabilities

### Modified Capabilities
- `update-flow`: The post-update banner must provide a clickable reopen action when the installed build hasn't loaded yet, matching other reload paths in the sidebar.

## Impact

- `src/components/update-flow.tsx` — add `onReopen` prop and button in the "reopen" state
- `src/sidebar.tsx` — pass `onReopen={() => quitOpencode(props.api)}` to `PostUpdateBanner`

## Non-goals

- Not reworking the migration flow or how `decision.show === "migrate"` works.
- Not adding a MIGRATIONS entry — this is a minor UX fix with no user-facing behavior that needs announcing.
