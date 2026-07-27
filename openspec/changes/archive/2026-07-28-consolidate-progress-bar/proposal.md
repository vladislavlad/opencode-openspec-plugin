## Why

Счётчик задач отображается тремя разными способами: в ChangeDetail как "Tasks: done/total" в заголовке CollapsibleSection, на sidebar как отдельная строка "N/M tasks done" над ProgressBar, и в ChangeRow как "${totalTasks} tasks". Три формата для одного смысла — непоследовательно и дублирует логику отображения прогресса.

## What Changes

- Добавить пропс `showNumberOfTasks` в `ProgressBar`, который рендерит строку "N/M tasks done" над баром
- Убрать `count={{done, total}}` из Tasks CollapsibleSection в ChangeDetail — показать просто "Tasks"
- Использовать один `ProgressBar` с `showNumberOfTasks` везде: sidebar Active Changes, ChangeRow и ChangeDetail

## Capabilities

### New Capabilities

### Modified Capabilities
- `ui-primitives`: ProgressBar получает опциональный пропс `showNumberOfTasks`, который добавляет строку со счётчиком задач над баром
- `change-tracking-ui`: ChangeRow заменяет отдельную строку "N tasks" на встроенный счётчик в ProgressBar; Tasks секция больше не показывает count

## Non-goals

- Не трогаем `count` prop CollapsibleSection для других секций (Completed Changes, Specifications)

## Impact

- `src/components/primitives.tsx` — ProgressBar: новый пропс `showNumberOfTasks`
- `src/components/changes.tsx` — ChangeDetail: убрать `count` у Tasks, добавить `showNumberOfTasks` в ProgressBar; ChangeRow: убрать `<text>` с "N tasks", добавить `showNumberOfTasks` в ProgressBar
- `src/sidebar.tsx` — заменить отдельный `<text>` со счётчиком на `showNumberOfTasks` в ProgressBar
