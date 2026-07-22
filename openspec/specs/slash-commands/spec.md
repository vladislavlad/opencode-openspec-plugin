## Purpose
Регистрация слэш-команд `/opsx-baseline` и `/opsx-config` в палитре OpenCode с привязанными шаблонами промптов для конфигурации проекта и создания базовой линии спецификаций.

## Requirements

### Requirement: Регистрация команды /opsx-baseline
Система SHALL зарегистрировать слэш-команду `/opsx-baseline` в пространстве имён `palette` с именем `openspec.baseline`, категорией `OpenSpec` и промптом `SPEC_BASELINE_PROMPT`.

#### Scenario: Успешная регистрация baseline
- **WHEN** функция `registerCommands` вызывается с валидным API
- **THEN** команда `/opsx-baseline` доступна в палитре с заголовком «OpenSpec: Baseline specs from code» и описанием «Configure, then derive/refresh openspec/specs from the existing implementation»

### Requirement: Регистрация команды /opsx-config
Система SHALL зарегистрировать слэш-команду `/opsx-config` в пространстве имён `palette` с именем `openspec.config`, категорией `OpenSpec` и промптом `CONFIG_PROMPT`.

#### Scenario: Успешная регистрация config
- **WHEN** функция `registerCommands` вызывается с валидным API
- **THEN** команда `/opsx-config` доступна в палитре с заголовком «OpenSpec: Configure project context» и описанием «Set stack, spec language and context in openspec/config.yaml»

### Requirement: Очистка ввода и отправка промпта
Система SHALL очищать текущий ввод пользователя и автоматически отправлять привязанный шаблон промпта при выполнении любой зарегистрированной команды.

#### Scenario: Выполнение команды /opsx-config
- **WHEN** пользователь выбирает `/opsx-config` из палитры
- **THEN** текст ввода очищается, а содержимое `CONFIG_PROMPT` отправляется модели

#### Scenario: Выполнение команды /opsx-baseline
- **WHEN** пользователь выбирает `/opsx-baseline` из палитры
- **THEN** текст ввода очищается, а содержимое `SPEC_BASELINE_PROMPT` отправляется модели

### Requirement: Безопасная обработка ошибки регистрации
Система SHALL перехватывать исключения при регистрации команды и показывать ошибку через toast, не прерывая работу остального интерфейса.

#### Scenario: Ошибка регистрации одной команды
- **WHEN** регистрация команды завершается с ошибкой
- **THEN** отображается toast с вариантом `error` и сообщением вида `openspec: failed to register /<slashName> (<причина>)`, а функция возвращает `false` для этой команды

### Requirement: Возврат доступности baseline
Система SHALL возвращать объект `{ baselineAvailable: boolean }`, указывающий, успешно ли зарегистрирована команда `/opsx-baseline`.

#### Scenario: Baseline зарегистрирован
- **WHEN** регистрация `/opsx-baseline` прошла без ошибок
- **THEN** `registerCommands` возвращает `{ baselineAvailable: true }`

#### Scenario: Baseline не зарегистрирован
- **WHEN** регистрация `/opsx-baseline` завершилась ошибкой
- **THEN** `registerCommands` возвращает `{ baselineAvailable: false }`

### Requirement: Промпт CONFIG_PROMPT — проверка наличия инициализации
Система SHALL проверять наличие директории `openspec/` перед выполнением конфигурации и требовать запуска инициализации при её отсутствии.

#### Scenario: OpenSpec не инициализирован
- **WHEN** промпт `/opsx-config` выполняется в проекте без директории `openspec/`
- **THEN** модель сообщает пользователю о необходимости запустить инициализацию OpenSpec и останавливается

### Requirement: Промпт SPEC_BASELINE_PROMPT — двухэтапный процесс
Система SHALL выполнять настройку конфигурации, а затем вывод спецификаций из кода при выполнении `/opsx-baseline`.

#### Scenario: Конфигурация уже существует
- **WHEN** `openspec/config.yaml` содержит блок `context`
- **THEN** промпт пропускает этап настройки и переходит непосредственно к выводу спецификаций

#### Scenario: Конфигурация отсутствует
- **WHEN** `openspec/config.yaml` не содержит блока `context`
- **THEN** промпт сначала выполняет шаги из `CONFIG_PROMPT`, затем переходит к выводу спецификаций
