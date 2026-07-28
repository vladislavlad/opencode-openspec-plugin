## Context

`PostUpdateBanner` in `update-flow.tsx` has two states: "reopen" (text only, no button) and "migrate" (with a "Complete Update" button). When the update installed but the new build hasn't loaded yet (`decision.show === "reopen"`), the user sees a message but must manually restart opencode. Other reload paths — `EphemeralReloadBanner` in init-flow and Settings' Reload button — both call `quitOpencode(props.api)` via a gated Button.

## Goals / Non-Goals

**Goals:**
- Add a "Reopen OpenCode" button to the reopen state, matching other reload buttons in the sidebar

**Non-Goals:**
- Not reworking the migration flow or decision logic

## Decisions

- Add `onReopen` prop to `PostUpdateBanner`, wired from sidebar as `() => quitOpencode(props.api)`. The button spreads `{...props.gate}` for consistency with other reload buttons. Label is "Reopen OpenCode" to match the message text and distinguish it from the init-flow's "Reload OpenCode".

## Risks / Trade-offs

- None — additive change, no behavior modification to existing paths.
