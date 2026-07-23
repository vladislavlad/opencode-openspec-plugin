## Purpose
Регистрация слэш-команд OpenSpec в палитре OpenCode: собственные `/opsx-config` и `/opsx-baseline` с шаблонами промптов, а также временная (эфемерная) регистрация записанных `openspec init` команд `/opsx-*`, чтобы они работали до перезапуска.

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
Система SHALL очищать текущий ввод пользователя и автоматически отправлять привязанный шаблон промпта при выполнении любой зарегистрированной команды, дополняя его текстом, введённым после слэша.

#### Scenario: Выполнение команды /opsx-config
- **WHEN** пользователь выбирает `/opsx-config` из палитры
- **THEN** текст ввода очищается, а содержимое `CONFIG_PROMPT` отправляется модели

#### Scenario: Выполнение команды /opsx-baseline
- **WHEN** пользователь выбирает `/opsx-baseline` из палитры
- **THEN** текст ввода очищается, а содержимое `SPEC_BASELINE_PROMPT` отправляется модели

#### Scenario: Передача аргументов
- **WHEN** после имени команды введён текст (например, имя изменения)
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
- **WHEN** `openspec/config.yaml` отсутствует или не содержит блока `context`
- **THEN** промпт сообщает пользователю запустить `/opsx-config` и останавливается

### Requirement: Эфемерная регистрация команд openspec init
Система SHALL по запросу регистрировать записанные `openspec init` файлы команд `/opsx-*` из `.opencode/commands` как эфемерные команды палитры, чтобы они работали в текущей сессии до перезапуска.

#### Scenario: Регистрация из файлов
- **WHEN** вызывается `registerOpsxFsCommands` и файлы команд присутствуют
- **THEN** для каждой команды (`opsx-apply`, `opsx-archive`, `opsx-explore`, `opsx-propose`, `opsx-sync`, `opsx-update`) регистрируется палитра-команда, чей `run` отправляет тело файла (без frontmatter) как промпт

#### Scenario: Идемпотентность
- **WHEN** `registerOpsxFsCommands` вызывается повторно
- **THEN** уже зарегистрированные в этой сессии команды пропускаются, дубликаты не создаются

### Requirement: Промпт инициализации — гарантия наличия CLI
Система SHALL в промпте инициализации гарантировать доступность CLI `openspec` перед запуском `openspec init`.

#### Scenario: CLI установлен
- **WHEN** `openspec --version` завершается успешно
- **THEN** сразу выполняется `openspec init --tools opencode`

#### Scenario: CLI отсутствует
- **WHEN** `openspec --version` не найден
- **THEN** определяются доступные пакет-менеджеры (`npm`, `pnpm`, `yarn`, `bun`), и через `question` предлагается глобальная установка выбранным менеджером либо отмена (`Cancel`), прерывающая весь процесс

### Requirement: CONFIG_PROMPT — обработка пустого проекта и языка
Система SHALL в `CONFIG_PROMPT` не пытаться выводить контекст из пустого проекта и предлагать в качестве языка только человеческий язык.

#### Scenario: Пустой проект
- **WHEN** в проекте нет кода, README и манифестов
- **THEN** промпт пропускает вывод контекста и сразу спрашивает у пользователя стек, язык, контекст и стиль, не предлагая создать или выбрать другой проект

#### Scenario: Язык спеков
- **WHEN** промпт спрашивает язык спецификаций
- **THEN** предлагаются только естественные (человеческие) языки, а не языки программирования
