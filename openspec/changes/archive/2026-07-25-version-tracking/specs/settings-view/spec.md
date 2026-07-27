## MODIFIED Requirements

### Requirement: Экран настроек отображает версии и обновления
Панель SHALL показывать в экране Settings секцию версий с текущими версиями плагина и openspec CLI, доступными обновлениями и кнопками управления.

#### Scenario: Отображение версии плагина
- **WHEN** открыт экран Settings
- **THEN** показывается строка «Plugin version» слева и значение текущей версии (например `0.2.0`) справа на той же строке

#### Scenario: Доступно обновление плагина
- **WHEN** `pluginUpdate` не равно `null`
- **THEN** под строкой версии отображается текст «x.y.z version available» и кнопка Update в следующей строке

#### Scenario: Отображение версии openspec CLI
- **WHEN** открыт экран Settings
- **THEN** показывается строка «OpenSpec CLI» слева и значение текущей версии (`generatedBy`) справа; если версия не определена – «unknown»

#### Scenario: Доступно обновление CLI
- **WHEN** `cliUpdate` не равно `null`
- **THEN** под строкой версии отображается текст «x.y.z version available» и кнопка Update в следующей строке

#### Scenario: Кнопка Check Versions
- **WHEN** открыт экран Settings
- **THEN** внизу секции версий отображается кнопка Check Versions, которая вызывает плагинную функцию `checkVersions` (без хода агента) для перезапуска проверки обновлений

#### Scenario: Нажатие Update для компонента
- **WHEN** пользователь нажимает Update у строки плагина или CLI при простое агента
- **THEN** плагин отправляет `buildUpdatePrompt` с этим компонентом через `sendPrompt`, кнопки блокируются до завершения хода агента; после обновления отображается сообщение «Reload opencode to update plugin» и кнопка Reload (`error`), закрывающая opencode

#### Scenario: Update заблокирован во время работы агента
- **WHEN** агент занят и пользователь нажимает Update или Update All
- **THEN** промпт не отправляется, показывается тост «Wait until the agent finishes working»

#### Scenario: Кнопка Update All
- **WHEN** доступно хотя бы одно обновление (плагина или CLI)
- **THEN** внизу секции версий отображается кнопка Update All, которая отправляет `buildUpdatePrompt` только с реально устаревшими компонентами

#### Scenario: Обновления недоступны – Update All скрыта
- **WHEN** обновления недоступны или проверка ещё не выполнена
- **THEN** кнопка Update All не отображается, видна только Check Versions
