## Context

In `ChangeActions`, the Apply and Update buttons spread `{...props.gate}` for blocking when busy, but Delete does not. A comment on line 57 justified this by saying "only opens the local confirm", but the final deletion through `deleteChange` can trigger `sendPrompt` if the local FS is unavailable.

## Goals / Non-Goals

**Goals:**
- Make Delete consistent with other buttons: blocked when the agent is busy

**Non-Goals:**
- Not changing the confirm dialog or deletion logic
- Not adding a new component — using the existing `gate` prop

## Decisions

- Simply add `{...props.gate}` to the Delete button — the same mechanism as for Apply/Update. The alternative (blocking only the confirm) is excessive: the user should not even initiate an action during busy.

## Risks / Trade-offs

- No risks — a one-line change using the existing `Gate` pattern
