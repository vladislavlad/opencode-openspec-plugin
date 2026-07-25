## MODIFIED Requirements

### Requirement: Экран инициализации
Панель SHALL показывать экран инициализации, когда openspec-тулинг не обнаружен в проекте.

#### Scenario: Показ экрана инициализации
- **WHEN** флаг `initialised` равен `false`
- **THEN** отображается компонент `NotInitialised` с кнопкой инициализации

#### Scenario: Нажатие кнопки инициализации
- **WHEN** пользователь нажимает кнопку инициализации
- **THEN** отправляется промпт `OPENSPEC_INIT_PROMPT`, который выполняет последовательность: установка openspec → настройка config.yaml (всегда) → опционально derivation specs

#### Scenario: Пропуск baseline
- **WHEN** пользователь на этапе init отказывается от derivation specs
- **THEN** проект остаётся с установленным openspec и настроенным config.yaml, готовым к ручному запуску `/opsx-baseline` позже
