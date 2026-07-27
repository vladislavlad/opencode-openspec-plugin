## Why

Пользователь не знает, когда доступна новая версия плагина (`@vladislavlad/opencode-openspec-plugin`) или openspec CLI (`@fission-ai/openspec`). Нужно проверять обновления при запуске sidebar, предлагать установку и выполнять миграции после перезагрузки.

## What Changes

- При загрузке sidebar **асинхронно** (не блокируя рендер) проверять npm registry на новые версии плагина и CLI; таймаут 3с, ошибки молча игнорировать
- current-версии: плагин – билд-константа `__PLUGIN_VERSION__`; CLI – `metadata.generatedBy` из `.opencode/skills/*/SKILL.md`
- latest-версии: GET к `registry.npmjs.org` для обоих пакетов (scoped-имена кодируются как `%2F`)
- Баннер над кнопками Explore/Propose: текст `textMuted`, кнопки Dismiss (`warn`) и Settings (`accent`)
- Кнопка Settings в заголовке – `accent` при hover; если доступно обновление – постоянный `accent`
- Экран Settings: секция версий (Plugin, OpenSpec CLI), **раздельные** кнопки Update, Check Versions, Update All
- Check Versions – мгновенный плагинный re-check (без агента); Update / Update All – прямой промпт агенту через `sendPrompt` (как Init), без регистрации palette-команд
- Обновление плагина = правка спецификатора версии в `tui.json` (не npm); обновление CLI = `npm i -g @fission-ai/openspec@<ver>` + `openspec update --force`
- После обновления плагина агент пишет `plugin.update-in-progress: { old, new }` в config.yaml; при перезагрузке плагин показывает баннер "Run checks after update" с кнопкой Complete Update
- Миграции хранятся в коде плагина (`migrations.ts`) как инструкции для агента

## Capabilities

### New Capabilities
- `version-tracking`: проверка обновлений через npm registry, обновление плагина через `tui.json` и CLI через npm + `openspec update --force`, миграции после перезагрузки через флаг `plugin.update-in-progress` в config.yaml.

### Modified Capabilities
- `sidebar-ui`: баннер обновлений над рядом действий; кнопка Settings при hover – `accent`; баннер "Run checks after update" с Complete Update
- `settings-view`: секция версий – плагин и CLI, доступные обновления, раздельные Update, Check Versions, Update All

## Impact

- `src/lib/updates.ts` – `fetchLatest(pkg)`, `readCliVersion` (парсинг `generatedBy`), `readUpdateFlag` (чтение config.yaml), сравнение версий, module-level store состояния
- `src/lib/migrations.ts` – мапа версия → инструкция миграции для агента
- `src/lib/prompts.ts` – `buildUpdatePrompt({ plugin?, cli? })`, `buildMigrationPrompt(range)`
- `src/components/settings.tsx` – секция версий в экране Settings
- `src/sidebar.tsx` – сигналы обновлений, banner UI, баннер post-update с Complete Update, проводка кнопок на `sendPrompt`
- `package.json` – зависимость `yaml` для парсинга config.yaml
- Network: HTTP-запросы к npm registry (`registry.npmjs.org`)

## Non-goals

- Не устанавливаем обновления автоматически – только предупреждаем и предлагаем
- Не делаем периодический фоновый опрос – проверка при загрузке sidebar и по кнопке Check Versions
- Не блокируем работу плагина при недоступности сети
- Не регистрируем palette-команд для обновления/проверки – всё вызывается из панели
- Update, Update All и Complete Update заблокированы, пока агент занят (busy); при нажатии – тост «Wait until the agent finishes working»
- Не определяем пакетный менеджер в плагине и не парсим lock-файлы – установку выполняет агент, current-версии читаются напрямую
