## Purpose
Регистрация собственных слэш-команд OpenSpec в палитре OpenCode – `/opsx-config` и `/opsx-baseline` – с привязкой шаблонов промптов, передачей аргументов и обработкой ошибок регистрации. Содержимое самих промптов принадлежит `project-config` и `spec-derivation`; временная регистрация записанных `openspec init` команд – `init-flow`.

## Requirements

### Requirement: Регистрация команды /opsx-baseline
Система SHALL зарегистрировать слэш-команду `/opsx-baseline` в пространстве имён `palette` с именем `openspec.baseline`, категорией `OpenSpec` и промптом `SPEC_BASELINE_PROMPT`. Описание команды SHALL соответствовать тому, что промпт действительно делает: настройку он не выполняет, а требует её заранее.

#### Scenario: Успешная регистрация baseline
- **WHEN** функция `registerCommands` вызывается с валидным API
- **THEN** команда `/opsx-baseline` доступна в палитре с заголовком «OpenSpec: Baseline specs from code» и описанием «Derive or refresh openspec/specs from the existing implementation (needs a configured project)»

### Requirement: Регистрация команды /opsx-config
Система SHALL зарегистрировать слэш-команду `/opsx-config` в пространстве имён `palette` с именем `openspec.config`, категорией `OpenSpec` и промптом `CONFIG_PROMPT`.

#### Scenario: Успешная регистрация config
- **WHEN** функция `registerCommands` вызывается с валидным API
- **THEN** команда `/opsx-config` доступна в палитре с заголовком «OpenSpec: Configure project context» и описанием «Set stack, spec language and context in openspec/config.yaml»

### Requirement: Очистка ввода и отправка промпта
Система SHALL очищать текущий ввод пользователя и автоматически отправлять привязанный шаблон промпта при выполнении любой зарегистрированной команды, дополняя его текстом, введённым после слэша.

#### Scenario: Выполнение команды /opsx-config
- **WHEN** пользователь выбирает `/opsx-config` из палитры
- **THEN** текст ввода очищается, а содержимое `CONFIG_PROMPT` отправляется модели

#### Scenario: Выполнение команды /opsx-baseline
- **WHEN** пользователь выбирает `/opsx-baseline` из палитры
- **THEN** текст ввода очищается, а содержимое `SPEC_BASELINE_PROMPT` отправляется модели

#### Scenario: Передача аргументов
- **WHEN** после имени команды введён текст (например, имя Change)
- **THEN** этот текст добавляется к промпту как аргументы команды

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

