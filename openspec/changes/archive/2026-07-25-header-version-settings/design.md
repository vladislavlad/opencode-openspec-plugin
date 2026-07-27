## Context

Заголовок sidebar в `src/sidebar.tsx` (строки 193-196) – это простой `<text>` с жирным «OpenSpec». Версия плагина хранится в `package.json` (`"version": "0.2.0"`). Навигация между views управляется SolidJS сигналами (`selected`, `selectedSpec`, `selectedReq`) и вложенными `<Show>` блоками.

## Goals / Non-Goals

**Goals:**
- Показать версию плагина при наведении на заголовок «OpenSpec»
- Добавить кнопку Settings справа в заголовке
- Реализовать Settings view с версией и кнопкой назад

**Non-Goals:**
- Дополнительные настройки – только версия как заглушка
- Изменение навигации существующих views

## Decisions

### Версия из build-time define
Версия вшивается на этапе сборки через `define` опцию Bun.build: `__PLUGIN_VERSION__: JSON.stringify(pkg.version)`. В коде константа с fallback: `const VERSION = typeof __PLUGIN_VERSION__ !== 'undefined' ? __PLUGIN_VERSION__ : 'dev'`.

**Рассмотренные альтернативы:** Runtime-импорт package.json – избыточно, версия статична. Хардкод в файле – требует ручного обновления при каждом релизе.

### Hover-подсказка версии на всю строку
Вся строка заголовка (`<box flexDirection="row">`) получает `onMouseOver`/`onMouseOut`. При hover версия показывается inline рядом с «OpenSpec» (цвет `textMuted`). Кнопка Settings меняет цвет: по умолчанию `textMuted`, при hover строки – `warn`.

**Рассмотренные альтернативы:** Hover только на тексте «OpenSpec» – менее удобен, так как зона клика узкая.

### Settings view как сигнал
Добавляется signal `showSettings` в sidebar.tsx. `<Show when={showSettings()}>` вставляется в цепочку fallback до основного контента, чтобы Settings перекрывал все views.

**Рассмотренные альтернативы:** Отдельный route – избыточно для одного экрана. Signal-based подход соответствует существующей архитектуре.

### Кнопка Settings
Используется существующий компонент `Button` из primitives.tsx. Цвет привязан к hover-сигналу строки: по умолчанию `textMuted`, при hover всей строки заголовка – `warn`.

### Layout экрана Settings
Заголовок «Settings» – цвет `warn`, без divider (отступ вместо разделителя). Строка версии: «Plugin version» слева, значение (`0.2.0`) справа на одной строке.

## Risks / Trade-offs

[Hover может конфликтовать с кликом по заголовку] → Заголовок не кликабелен, конфликта нет.
[TUI mouse events могут быть ограничены] → Использовать те же обработчики, что в `Button` (primitives.tsx:34-46).
