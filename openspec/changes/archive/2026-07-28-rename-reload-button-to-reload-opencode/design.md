## Context

The Settings view has a "Reload" button that reopens opencode. The init-flow `EphemeralReloadBanner` uses "Reload OpenCode" for the same action. Both buttons call `quitOpencode(props.api)` — identical behavior, different labels.

## Goals / Non-Goals

**Goals:**
- Make every reload button label consistent: "Reload OpenCode"

**Non-Goals:**
- Not renaming other buttons or reworking sidebar layout

## Decisions

- Change `label="Reload"` to `label="Reload OpenCode"` in `settings.tsx` — one-line edit matching the existing `EphemeralReloadBanner`.

## Risks / Trade-offs

- None — cosmetic label change, no behavior modification.
