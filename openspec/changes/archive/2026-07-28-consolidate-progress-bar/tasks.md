## 1. ProgressBar – new showNumberOfTasks prop

- [x] 1.1 Add optional prop `showNumberOfTasks?: boolean` to ProgressBar (`src/components/primitives.tsx`)
- [x] 1.2 When `showNumberOfTasks === true`, render line "N/M tasks done" above bar in muted color (without leading spaces)
- [x] 1.3 Remove hardcoded two spaces before `[` in ProgressBar – replace with `paddingLeft={2}` on all three callers: sidebar collapsedSummary, ChangeRow, ChangeDetail

## 2. ChangeRow – remove "N tasks", add showNumberOfTasks

- [x] 2.1 Remove `<text>` with `${totalTasks} tasks` from ChangeRow (`src/components/changes.tsx`)
- [x] 2.2 Add `showNumberOfTasks={true}` to ProgressBar in ChangeRow

## 3. ChangeDetail – remove count from Tasks, add showNumberOfTasks

- [x] 3.1 Remove `count={{done, total}}` from Tasks CollapsibleSection in ChangeDetail (`src/components/changes.tsx`)
- [x] 3.2 Add `showNumberOfTasks={true}` to ProgressBar below Change name

## 4. Sidebar – replace separate text with showNumberOfTasks

- [x] 4.1 Remove `<text>` with line "${activeDone()}/${activeTotal()} tasks done" from Active Changes collapsedSummary (`src/sidebar.tsx`)
- [x] 4.2 Add `showNumberOfTasks={true}` to ProgressBar in collapsedSummary

## 5. Verification

- [x] 5.1 Run typecheck and tests
