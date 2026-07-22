## Why

Сейчас настройка `config.yaml` встроена внутрь этапа baseline — если пользователь запускает только init или отказывается от baseline, конфиг остаётся пустым и последующие артефакты генерируются без контекста. Config должен запускаться всегда сразу после инициализации openspec. Этап derive (baseline) остаётся опциональным — запускается только при ответе пользователя «Да», как сейчас. Логику не ломаем, только меняем местами: config → ask → derive (если Да).

## What Changes

- Вынести этап config из `SPEC_BASELINE_PROMPT` в отдельный шаг, который выполняется всегда после init
- Обновить `OPENSPEC_INIT_PROMPT`: после успешного init → сначала config → затем опционально baseline (только derivation specs)
- Упростить `SPEC_BASELINE_PROMPT`: убрать встроенный config, оставить только derivation specs

## Capabilities

### New Capabilities

### Modified Capabilities
- `sidebar-ui`: Изменить последовательность шагов в init flow — config всегда выполняется первым после инициализации, baseline следует за ним

## Impact

- `src/lib/prompts.ts`: перестройка `OPENSPEC_INIT_PROMPT`, `SPEC_BASELINE_PROMPT`
- Поведение кнопки init в sidebar: теперь 2 этапа вместо одного комбинированного

## Non-goals

- Не меняем саму логику config и baseline — только порядок их вызова
- Не трогаем `/opsx-config` и `/opsx-baseline` slash commands как отдельные команды
