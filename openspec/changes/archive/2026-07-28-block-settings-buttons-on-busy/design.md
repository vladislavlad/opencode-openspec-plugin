## Context

`settings.tsx` receives `gate: Gate` as a prop (which carries `disabled: () => boolean`), but the "Check Versions" and "Reload" buttons don't spread it. All other action buttons in Settings (`Update`, `Update All`) already use `{...props.gate}`.

## Goals / Non-Goals

**Goals:**
- Block Check Versions and Reload while the agent is busy, consistent with every other sidebar button.

**Non-Goals:**
- Not adding a new gating mechanism — reuse the existing `Gate` type.

## Decisions

- Spread `{...props.gate}` on both Button elements. No logic changes needed — the gate already knows about `busy`, and clicking a disabled button already triggers `toastBusy`.
