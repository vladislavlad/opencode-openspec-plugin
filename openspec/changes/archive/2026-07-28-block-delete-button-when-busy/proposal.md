## Why

Кнопка Delete в Active Change не блокируется когда агент busy, в то время как Apply и Update корректно дизейблятся через `gate`. Это создаёт несогласованный UX: пользователь может нажать Delete во время выполнения agent-операции.

## What Changes

- Добавить `{...props.gate}` на кнопку Delete в `ChangeActions`, чтобы она блокировалась вместе с Apply и Update
- Убрать устаревший комментарий, который обосновывал отсутствие gate

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `change-tracking-ui`: кнопка Delete SHALL блокироваться когда агент busy, как и остальные кнопки действий

## Impact

- `src/components/changes.tsx` — один edit на строке с Delete button в `ChangeActions`

## Non-goals

- Не меняем поведение подтверждения удаления (confirm dialog)
- Не затрагиваем Completed Change actions — там нет Delete
