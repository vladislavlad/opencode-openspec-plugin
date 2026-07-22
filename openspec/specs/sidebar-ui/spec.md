## Purpose
Боковая панель OpenSpec отображает актуальное состояние проекта: прогресс задач, активные и завершённые изменения, спецификации. Панель опрашивает данные в реальном времени и предоставляет навигацию с детализацией по уровням.

## Requirements

### Requirement: Опрос данных openspec
The sidebar SHALL periodically poll the openspec directory for updated data and re-render the UI accordingly.

#### Scenario: Периодический опрос
- **WHEN** боковая панель активна и рабочая директория установлена
- **THEN** данные перезагружаются каждые 3 секунды через `setInterval`

#### Scenario: Смена директории
- **WHEN** значение `props.api.state.path.directory` изменяется
- **THEN** выполняется немедленная перезагрузка данных

#### Scenario: Ошибка загрузки
- **WHEN** запрос к файловой системе завершается с ошибкой
- **THEN** summary сбрасывается в `null`, а состояние инициализации устанавливается в `false`

### Requirement: Экран инициализации
The sidebar SHALL display the init screen when openspec tooling is not detected in the project.

#### Scenario: Показ экрана инициализации
- **WHEN** флаг `initialised` равен `false`
- **THEN** отображается компонент `NotInitialised` с кнопкой инициализации

#### Scenario: Нажатие кнопки инициализации
- **WHEN** пользователь нажимает кнопку инициализации
- **THEN** отправляется промпт `OPENSPEC_INIT_PROMPT`, который выполняет последовательность: установка openspec → настройка config.yaml (всегда) → опционально derivation specs

#### Scenario: Пропуск baseline
- **WHEN** пользователь на этапе init отказывается от derivation specs
- **THEN** проект остаётся с установленным openspec и настроенным config.yaml, готовым к ручному запуску `/opsx-baseline` позже

### Requirement: Прогресс-бар задач
The sidebar SHALL display an overall tasks progress bar aggregating completed and total tasks across all changes.

#### Scenario: Отображение прогресса
- **WHEN** проект инициализирован и summary содержит изменения
- **THEN** отображается строка «Tasks Progress» с текстом `completed/total` и компонентом `ProgressBar`

#### Scenario: Отсутствие задач
- **WHEN** в summary нет изменений или все счётчики равны нулю
- **THEN** прогресс отображается как `0/0`

### Requirement: Секция активных изменений
The sidebar SHALL render a collapsible "Active Changes" section listing all changes that are not yet complete.

#### Scenario: Отображение активных изменений
- **WHEN** summary содержит изменения, для которых `isComplete()` возвращает `false`
- **THEN** секция «Active Changes» отображает строки `ChangeRow` с количеством элементов в заголовке

#### Scenario: Автооткрытие при появлении элементов
- **WHEN** активные изменения появляются впервые после загрузки
- **THEN** секция автоматически раскрывается один раз

#### Scenario: Сворачивание и разворачивание
- **WHEN** пользователь нажимает на заголовок секции
- **THEN** секция переключается между свёрнутым и развёрнутым состоянием

### Requirement: Секция завершённых изменений
The sidebar SHALL render a collapsible "Completed Changes" section listing all changes marked as complete.

#### Scenario: Отображение завершённых изменений
- **WHEN** summary содержит изменения, для которых `isComplete()` возвращает `true`
- **THEN** секция «Completed Changes» отображает строки `ChangeRow` с количеством элементов в заголовке

### Requirement: Секция спецификаций
The sidebar SHALL render a collapsible "Specifications" section listing all specs from the summary.

#### Scenario: Отображение спецификаций
- **WHEN** summary содержит список спецификаций
- **THEN** секция «Specifications» отображает строки `SpecRow` с количеством элементов в заголовке

#### Scenario: Автооткрытие при появлении элементов
- **WHEN** спецификации появляются впервые после загрузки
- **THEN** секция автоматически раскрывается один раз

### Requirement: Навигация с детализацией
The sidebar SHALL support drill-in navigation through changes, specs, and requirements with mutually exclusive selection state.

#### Scenario: Открытие деталей изменения
- **WHEN** пользователь выбирает строку из списка изменений
- **THEN** отображается `ChangeDetail`, а выделения spec и requirement сбрасываются

#### Scenario: Открытие деталей спецификации
- **WHEN** пользователь выбирает строку из списка спецификаций
- **THEN** отображается `SpecDetail`, а выделение change и requirement сбрасывается

#### Scenario: Открытие-details требования
- **WHEN** пользователь выбирает требование внутри спецификации
- **THEN** отображается `RequirementDetail` поверх `SpecDetail`

#### Scenario: Кнопка «назад»
- **WHEN** пользователь нажимает кнопку возврата в любом детализированном представлении
- **THEN** навигация возвращается к предыдущему уровню, а hover-состояние сбрасывается
