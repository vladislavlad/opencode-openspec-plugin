## Why

The task counter is displayed in three different ways: in ChangeDetail as "Tasks: done/total" in the CollapsibleSection heading, on sidebar as a separate line "N/M tasks done" above ProgressBar, and in ChangeRow as "${totalTasks} tasks". Three formats for one meaning – inconsistent and duplicates progress display logic.

## What Changes

- Add `showNumberOfTasks` prop to `ProgressBar`, which renders the line "N/M tasks done" above the bar
- Remove `count={{done, total}}` from Tasks CollapsibleSection in ChangeDetail – show just "Tasks"
- Use a single `ProgressBar` with `showNumberOfTasks` everywhere: sidebar Active Changes, ChangeRow, and ChangeDetail

## Capabilities

### New Capabilities

### Modified Capabilities
- `ui-primitives`: ProgressBar gets optional prop `showNumberOfTasks`, which adds a task counter line above the bar
- `change-tracking-ui`: ChangeRow replaces separate "N tasks" line with inline counter in ProgressBar; Tasks section no longer shows count

## Non-goals

- Not touching `count` prop of CollapsibleSection for other sections (Completed Changes, Specifications)

## Impact

- `src/components/primitives.tsx` – ProgressBar: new prop `showNumberOfTasks`
- `src/components/changes.tsx` – ChangeDetail: remove `count` from Tasks, add `showNumberOfTasks` to ProgressBar; ChangeRow: remove `<text>` with "N tasks", add `showNumberOfTasks` to ProgressBar
- `src/sidebar.tsx` – replace separate `<text>` with counter with `showNumberOfTasks` in ProgressBar
