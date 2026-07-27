## Context

ProgressBar — единственный компонент для визуализации прогресса задач, но отображение текстового счётчика "N/M tasks done" реализовано по-разному в sidebar (отдельный `<text>`), ChangeRow (`${totalTasks} tasks`) и ChangeDetail (`count` prop CollapsibleSection). Нужно свести к одному формату.

## Goals / Non-Goals

**Goals:**
- Один ProgressBar с опциональным `showNumberOfTasks` рендерит строку "N/M tasks done" над баром
- Tasks в ChangeDetail — просто "Tasks", без счётчика в заголовке
- Формат прогресса консистентен на sidebar, ChangeRow и ChangeDetail

**Non-Goals:**
- Не трогаем `count` prop CollapsibleSection для других секций (Completed Changes, Specifications)

## Decisions

- **Пропс `showNumberOfTasks: boolean` вместо общего `label`** — задача конкретна, не нужно усложнять компонент абстрактным API. Строка "N/M tasks done" рендерится над баром без ведущих пробелов; отступ обеспечивается через `paddingLeft={2}` на уровне вызывающего `<box>`.
- **Убираем `count` у Tasks в ChangeDetail** — прогресс уже виден из ProgressBar под названием Change; дублирование в заголовке секции избыточно.
- **Убираем "N tasks" в ChangeRow** — заменяем на `showNumberOfTasks` в том же ProgressBar, который уже есть в строке.

## Risks / Trade-offs

Нет рисков — косметическое изменение, не затрагивает логику и данные.
