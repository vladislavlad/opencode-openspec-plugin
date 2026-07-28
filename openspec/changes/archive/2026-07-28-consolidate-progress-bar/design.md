## Context

ProgressBar is the only component for visualizing task progress, but displaying the text counter "N/M tasks done" is implemented differently in sidebar (separate `<text>`), ChangeRow (`${totalTasks} tasks`), and ChangeDetail (`count` prop of CollapsibleSection). Need to consolidate into one format.

## Goals / Non-Goals

**Goals:**
- One ProgressBar with optional `showNumberOfTasks` renders the line "N/M tasks done" above the bar
- Tasks in ChangeDetail – just "Tasks", without counter in heading
- Progress format is consistent across sidebar, ChangeRow, and ChangeDetail

**Non-Goals:**
- Not touching `count` prop of CollapsibleSection for other sections (Completed Changes, Specifications)

## Decisions

- **Prop `showNumberOfTasks: boolean` instead of generic `label`** – the task is specific, no need to complicate the component with an abstract API. Line "N/M tasks done" renders above the bar without leading spaces; indentation is provided via `paddingLeft={2}` at the calling `<box>` level.
- **Remove `count` from Tasks in ChangeDetail** – progress is already visible from ProgressBar below the Change name; duplication in section heading is redundant.
- **Remove "N tasks" from ChangeRow** – replace with `showNumberOfTasks` in the same ProgressBar that already exists in the row.

## Risks / Trade-offs

No risks – cosmetic change, does not affect logic or data.
