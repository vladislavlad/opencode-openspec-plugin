## 1. ProgressBar — новый пропс showNumberOfTasks

- [x] 1.1 Добавить опциональный пропс `showNumberOfTasks?: boolean` в ProgressBar (`src/components/primitives.tsx`)
- [x] 1.2 При `showNumberOfTasks === true` рендерить строку "N/M tasks done" над баром цветом muted (без ведущих пробелов)
- [x] 1.3 Убрать хардкод двух пробелов перед `[` в ProgressBar — заменить на `paddingLeft={2}` у всех трёх вызывающих: sidebar collapsedSummary, ChangeRow, ChangeDetail

## 2. ChangeRow — убрать "N tasks", добавить showNumberOfTasks

- [x] 2.1 Убрать `<text>` с `${totalTasks} tasks` из ChangeRow (`src/components/changes.tsx`)
- [x] 2.2 Добавить `showNumberOfTasks={true}` в ProgressBar в ChangeRow

## 3. ChangeDetail — убрать count у Tasks, добавить showNumberOfTasks

- [x] 3.1 Убрать `count={{done, total}}` из Tasks CollapsibleSection в ChangeDetail (`src/components/changes.tsx`)
- [x] 3.2 Добавить `showNumberOfTasks={true}` в ProgressBar под названием Change

## 4. Sidebar — заменить отдельный text на showNumberOfTasks

- [x] 4.1 Убрать `<text>` со строкой "${activeDone()}/${activeTotal()} tasks done" из collapsedSummary Active Changes (`src/sidebar.tsx`)
- [x] 4.2 Добавить `showNumberOfTasks={true}` в ProgressBar в collapsedSummary

## 5. Проверка

- [x] 5.1 Прогнать typecheck и тесты
