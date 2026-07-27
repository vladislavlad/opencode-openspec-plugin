## ADDED Requirements

### Requirement: Баннер предупреждения о доступных обновлениях в sidebar
Панель SHALL показывать баннер над рядом действий (Explore/Propose), если доступно обновление плагина или CLI.

#### Scenario: Показ banner при наличии обновлений
- **WHEN** `pluginUpdate` или `cliUpdate` не равны `null` и banner не dismissed
- **THEN** отображается строка с текстом `textMuted` о доступных обновлениях, кнопкой Dismiss (`warn`) и кнопкой Settings (`accent`)

#### Scenario: Скрытие banner по Dismiss
- **WHEN** пользователь нажимает Dismiss
- **THEN** banner скрывается до следующей перезагрузки данных или нажатия Check Versions в Settings

#### Scenario: Нажатие Settings в banner
- **WHEN** пользователь нажимает Settings в banner
- **THEN** открывается экран Settings, banner остаётся скрытым

#### Scenario: Banner не показывается при отсутствии обновлений
- **WHEN** обновления недоступны или проверка завершилась ошибкой
- **THEN** banner не отображается, ряд действий виден сразу

### Requirement: Кнопка Settings в заголовке меняет цвет на `accent` при hover
Кнопка Settings в строке заголовка SHALL менять цвет с `textMuted` на `accent` при наведении курсора. Если доступно обновление, кнопка отображается цветом `accent` постоянно.

#### Scenario: Hover строки заголовка
- **WHEN** курсор находится над строкой заголовка sidebar
- **THEN** кнопка Settings меняет цвет на `accent`

#### Scenario: Уход курсора без обновлений
- **WHEN** курсор уходит со строки заголовка и обновления недоступны
- **THEN** кнопка Settings возвращается к цвету `textMuted`

#### Scenario: Обновление доступно – постоянный accent
- **WHEN** `pluginUpdate` или `cliUpdate` не равны `null`
- **THEN** кнопка Settings отображается цветом `accent` независимо от hover

### Requirement: Баннер post-update в sidebar
Панель SHALL показывать баннер "Run checks after update" над рядом действий, если в config.yaml обнаружен флаг `plugin.update-in-progress` и новая версия совпадает с загруженной.

#### Scenario: Показ banner после перезагрузки
- **WHEN** плагин загружается, `updateFlag` содержит `{ old, new }` и `flag.new === VERSION`
- **THEN** отображается баннер с текстом о необходимости завершения обновления и кнопкой Complete Update (`accent`)

#### Scenario: Новая версия не подхватилась
- **WHEN** `updateFlag` содержит `{ old, new }`, но `flag.new !== VERSION`
- **THEN** вместо кнопки Complete Update показывается мягкий хинт «reopen opencode to finish update», миграции не запускаются

#### Scenario: Нажатие Complete Update
- **WHEN** пользователь нажимает Complete Update при простое агента
- **THEN** плагин формирует промпт из миграционных инструкций для диапазона `(old, new]` и отправляет агенту напрямую; кнопки блокируются до завершения хода агента

#### Scenario: Complete Update заблокирован во время работы агента
- **WHEN** агент занят и пользователь нажимает Complete Update
- **THEN** промпт не отправляется, показывается тост «Wait until the agent finishes working»

#### Scenario: Успешное завершение миграции
- **WHEN** агент завершил ход после Complete Update и снял `plugin.update-in-progress` из config.yaml
- **THEN** `updateFlag` становится `null`, banner скрывается
