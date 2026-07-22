## Purpose
Эта возможность отвечает за регистрацию плагина в системе OpenCode, внедрение виджета боковой панели через TUI-слоты и удаление изменений OpenSpec с откатом к агенту при недоступности файловой системы.

## Requirements

### Requirement: Экспорт модуля плагина
Система SHALL экспортировать объект по умолчанию, удовлетворяющий типу `TuiPluginModule`, содержащий поле `id` со значением `"openspec-tui"` и асинхронную функцию `tui`.

#### Scenario: Стандартный экспорт
- **WHEN** модуль `src/index.tsx` импортирован как default export
- **THEN** результат содержит свойства `id` равное `"openspec-tui"` и вызываемое свойство `tui`

### Requirement: Регистрация TUI-слота боковой панели
Система SHALL зарегистрировать слот `sidebar_content` с порядковым номером 600 через `api.slots.register`.

#### Scenario: Вызов функции tui
- **WHEN** функция `tui` вызывается с объектом API
- **THEN** метод `api.slots.register` вызван один раз с параметром `{ order: 600, slots: { sidebar_content } }`

#### Scenario: Слот возвращает компонент боковой панели
- **WHEN** зарегистрированный слот `sidebar_content` вызывается
- **THEN** возвращается JSX-компонент `<OpenSpecSidebar>` с пропсами `api`, `onDelete` и `baselineAvailable`

### Requirement: Регистрация команд
Система SHALL вызвать функцию `registerCommands(api)` при инициализации плагина для регистрации CLI-команд.

#### Scenario: Инициализация плагина
- **WHEN** функция `tui` вызывается с объектом API
- **THEN** функция `registerCommands` вызвана с переданным `api`, а возвращаемое значение используется как пропс `baselineAvailable` для боковой панели

### Requirement: Удаление изменения через файловую систему
Система SHALL попытаться удалить папку изменения из обеих возможных директорий (`openspec/changes/{name}` и `.openspec/changes/{name}`) с помощью `fs.rm`.

#### Scenario: Успешный доступ к файловой системе
- **WHEN** функция `deleteChange` вызывается при наличии `api.state.path.directory` и доступной файловой системы
- **THEN** модуль `node:fs/promises` загружен, а `fs.rm` вызван для путей `{dir}/openspec/changes/{name}` и `{dir}/.openspec/changes/{name}` с опциями `{ recursive: true, force: true }`

### Requirement: Откат удаления к агенту
Система SHALL передать запрос на удаление агенту через `sendPrompt`, если доступ к файловой системе недоступен или рабочая директория не определена.

#### Scenario: Файловая система недоступна
- **WHEN** импорт `node:fs/promises` или вызов `fs.rm` завершается с ошибкой
- **THEN** функция `sendPrompt` вызвана с `api` и строкой `"delete openspec change {name}"`

#### Scenario: Рабочая директория отсутствует
- **WHEN** `api.state.path.directory` равен `undefined` или `null`
- **THEN** функция `sendPrompt` вызвана с `api` и строкой `"delete openspec change {name}"`

### Requirement: Обработчик удаления передаётся в боковую панель
Система SHALL передать функцию обратного вызова `onDelete` в компонент `<OpenSpecSidebar>`, которая при вызове инициирует удаление изменения.

#### Scenario: Вызов onDelete из боковой панели
- **WHEN** пропс `onDelete` вызывается с именем изменения
- **THEN** функция `deleteChange` вызвана с текущим `api` и переданным именем
