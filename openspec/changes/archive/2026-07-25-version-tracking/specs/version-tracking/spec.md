## ADDED Requirements

### Requirement: Проверка обновления плагина через npm registry
Плагин SHALL асинхронно проверять наличие новой версии `@vladislavlad/opencode-openspec-plugin` в npm registry при загрузке sidebar и по запросу пользователя, не блокируя рендер.

#### Scenario: Успешная проверка
- **WHEN** sidebar загружается или пользователь нажимает Check Versions
- **THEN** HTTP GET к `registry.npmjs.org/@vladislavlad%2Fopencode-openspec-plugin/latest` возвращает актуальную версию, которая сравнивается с текущей (`__PLUGIN_VERSION__`)

#### Scenario: Доступно обновление плагина
- **WHEN** версия latest в npm больше текущей версии плагина
- **THEN** состояние `pluginUpdate` содержит `{ current, next }`, banner показывается

#### Scenario: Обновления нет
- **WHEN** версия latest совпадает с текущей или меньше
- **THEN** состояние `pluginUpdate` равно `null`, banner не показывается

#### Scenario: Ошибка запроса к npm registry
- **WHEN** HTTP-запрос завершается с ошибкой или таймаутом (3с)
- **THEN** ошибка игнорируется молча, `pluginUpdate` равен `null`, banner не показывается, рендер не задерживается

### Requirement: Определение версии CLI и проверка обновления
Плагин SHALL определять текущую версию openspec CLI из штампа `generatedBy` и проверять наличие обновления через npm registry.

#### Scenario: Определение current-версии CLI
- **WHEN** существует хотя бы один `.opencode/skills/*/SKILL.md`
- **THEN** плагин извлекает `metadata.generatedBy` как текущую версию CLI

#### Scenario: Версия CLI не определена
- **WHEN** ни один `SKILL.md` не найден или в нём нет `generatedBy`
- **THEN** плагин устанавливает версию CLI в «unknown», проверка обновления CLI пропускается

#### Scenario: Проверка версии CLI через npm registry
- **WHEN** current-версия CLI определена и HTTP GET к `registry.npmjs.org/@fission-ai%2Fopenspec/latest` завершается успешно
- **THEN** плагин извлекает версию latest openspec CLI и сравнивает с `generatedBy`

#### Scenario: Доступно обновление CLI
- **WHEN** версия latest openspec больше текущей
- **THEN** состояние `cliUpdate` содержит `{ current, next }`, banner показывается

#### Scenario: Ошибка проверки CLI
- **WHEN** запрос к registry завершается с ошибкой или версия не определена
- **THEN** ошибка игнорируется молча, `cliUpdate` равен `null`

### Requirement: Проверка версий из панели
Плагин SHALL предоставлять плагинную функцию проверки версий, вызываемую при загрузке sidebar и кнопкой Check Versions, без хода агента. Ручная проверка SHALL сообщать итог тостом.

#### Scenario: Автопроверка при загрузке
- **WHEN** sidebar загружается и определена директория проекта
- **THEN** плагин вызывает `checkVersions` асинхронно (fire-and-forget), результат кладётся в сигналы sidebar; тост не показывается

#### Scenario: Ручная проверка
- **WHEN** пользователь нажимает Check Versions в Settings
- **THEN** плагин повторно вызывает `checkVersions` (обычный fetch, без агента) и обновляет сигналы; dismissed-баннер снова может показаться

#### Scenario: Ручная проверка – всё актуально
- **WHEN** ручная проверка завершилась успешно (`reachable`) и обновлений нет
- **THEN** показывается тост `success` «All versions are up to date»

#### Scenario: Ручная проверка – доступно обновление
- **WHEN** ручная проверка нашла обновление плагина или CLI
- **THEN** тост не показывается – обновление подсвечивается в баннере и строках Settings

#### Scenario: Ручная проверка – registry недоступен
- **WHEN** ручная проверка не смогла достучаться до registry (оба запроса вернули `null`, `reachable` = false)
- **THEN** показывается тост `warning` «Couldn't reach npm registry», ложное «актуально» не выводится

### Requirement: Обновление плагина и CLI прямым промптом
Панель SHALL запускать обновление прямым промптом агенту через `sendPrompt`, без регистрации palette-команд, раздельно для плагина и CLI.

#### Scenario: Обновление плагина
- **WHEN** пользователь нажимает Update у строки плагина при простое агента
- **THEN** плагин отправляет `buildUpdatePrompt({ plugin })`; агент правит спецификатор в `tui.json` на `@vladislavlad/opencode-openspec-plugin@<next>`, записывает `plugin.update-in-progress: { old, new }` в config.yaml и сообщает о необходимости перезапуска opencode

#### Scenario: Обновление CLI
- **WHEN** пользователь нажимает Update у строки CLI при простое агента
- **THEN** плагин отправляет `buildUpdatePrompt({ cli })`; агент выполняет `npm i -g @fission-ai/openspec@<next>` через определённый пакетный менеджер и `openspec update --force`, затем сообщает о необходимости перезапуска opencode

#### Scenario: Update All
- **WHEN** пользователь нажимает Update All при простое агента
- **THEN** плагин отправляет `buildUpdatePrompt` только с реально устаревшими компонентами; блоки плагина и CLI объединяются, reload запрашивается один раз

#### Scenario: Dev-запись в tui.json
- **WHEN** запись плагина в `tui.json` – локальный путь (dev-режим), а не npm-имя
- **THEN** PLUGIN-блок промпта пропускается – обновлять нечего

#### Scenario: Обновление заблокировано во время работы агента
- **WHEN** агент занят и пользователь нажимает Update или Update All
- **THEN** промпт не отправляется, показывается тост «Wait until the agent finishes working»

### Requirement: Флаг update-in-progress в config.yaml
Плагин SHALL читать флаг `plugin.update-in-progress` из config.yaml при загрузке и показывать баннер post-update.

#### Scenario: Обнаружение флага при загрузке
- **WHEN** плагин загружается и config.yaml содержит `plugin.update-in-progress` с полями `old`/`new`
- **THEN** состояние `updateFlag` содержит `{ old, new }`

#### Scenario: Флаг отсутствует
- **WHEN** config.yaml не содержит `plugin.update-in-progress`
- **THEN** `updateFlag` равен `null`, баннер post-update не показывается, плагин работает в обычном режиме

#### Scenario: Флаг пишется только при обновлении плагина
- **WHEN** выполняется CLI-only обновление
- **THEN** `plugin.update-in-progress` не записывается – после reload баннер post-update не показывается

### Requirement: Миграции после обновления
Панель SHALL предоставлять кнопку Complete Update, которая формирует промпт из миграционных инструкций и release notes и отправляет агенту напрямую. Каждая миграция описывается как `Migration { instructions, releaseNotes }`.

#### Scenario: Нажатие Complete Update
- **WHEN** пользователь нажимает Complete Update при простое агента
- **THEN** плагин читает `updateFlag`, вызывает `buildMigrationPrompt({ old, new })` (миграции из `migrations.ts` для диапазона `(old, new]`) и отправляет промпт агенту через `sendPrompt`

#### Scenario: Агент рассказывает что нового
- **WHEN** у миграций в диапазоне заполнены `releaseNotes`
- **THEN** промпт просит агента изложить пользователю, какие фичи появились в этих версиях (по версиям), помимо выполнения `instructions`

#### Scenario: Complete Update заблокирован во время работы агента
- **WHEN** агент занят и пользователь нажимает Complete Update
- **THEN** промпт не отправляется, показывается тост «Wait until the agent finishes working»

#### Scenario: Миграция выполнена успешно
- **WHEN** агент завершил ход после Complete Update и снял `plugin.update-in-progress` из config.yaml
- **THEN** следующий poll видит пустой флаг, `updateFlag` становится `null`, banner скрывается

#### Scenario: Инструкции миграции не найдены
- **WHEN** для диапазона версий нет инструкций в `migrations.ts`
- **THEN** агент получает минимальный промпт с проверкой версий и снятием флага `plugin.update-in-progress`
