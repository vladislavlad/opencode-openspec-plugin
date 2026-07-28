## Why

The Delete button in Active Change is not blocked when the agent is busy, while Apply and Update are correctly disabled through `gate`. This creates an inconsistent UX: the user can press Delete during an agent operation.

## What Changes

- Add `{...props.gate}` to the Delete button in `ChangeActions` so it blocks together with Apply and Update
- Remove the outdated comment that justified the absence of gate

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `change-tracking-ui`: the Delete button SHALL be blocked when the agent is busy, like all other action buttons

## Impact

- `src/components/changes.tsx` — one edit on the line with the Delete button in `ChangeActions`

## Non-goals

- Not changing the deletion confirmation behavior (confirm dialog)
- Not touching Completed Change actions — there is no Delete there
