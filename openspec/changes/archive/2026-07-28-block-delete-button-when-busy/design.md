## Context

В `ChangeActions` кнопки Apply и Update спредят `{...props.gate}` для блокировки при busy, а Delete — нет. Комментарий на строке 57 обосновывал это тем, что "only opens the local confirm", но финальное удаление через `deleteChange` может вызвать `sendPrompt`, если локальный FS недоступен.

## Goals / Non-Goals

**Goals:**
- Сделать Delete консистентным с остальными кнопками: блокируется когда агент busy

**Non-Goals:**
- Не меняем confirm dialog или логику удаления
- Не добавляем новый компонент — используем существующий `gate` prop

## Decisions

- Просто добавить `{...props.gate}` на Delete button — тот же механизм, что для Apply/Update. Альтернатива (блокировать только confirm) избыточна: пользователь не должен даже инициировать действие во время busy.

## Risks / Trade-offs

- Нет рисков — изменение однострочное, использует существующий `Gate` pattern
