## 1. Проверка обновлений – lib

- [x] 1.1 Создать `src/lib/updates.ts` – `fetchLatest(pkg)`: HTTP GET к `registry.npmjs.org/<pkg>/latest` (scoped-имя → `%2F`) с `AbortController` (timeout 3с), возврат `version | null` (ошибка/таймаут → `null`)
- [x] 1.2 Добавить `readCliVersion(client)`: перебор `.opencode/skills/*/SKILL.md`, парсинг `generatedBy` (regex `/generatedBy:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?/`), возврат версии или `null` («unknown»)
- [x] 1.3 Добавить `checkVersions(client)`: current плагина = `VERSION`, current CLI = `readCliVersion`; latest обоих = `fetchLatest` (параллельно, `Promise.all`); сравнение через `semverGt`; возврат `VersionState { pluginCurrent, cliCurrent, reachable, plugin, cli }` (plugin/cli = `{ current, next } | null`). Состояние держит sidebar в сигналах – отдельный module-level store не понадобился
- [x] 1.4 Добавить `readUpdateFlag(client)`: чтение `openspec/config.yaml` (root `openspec`/`.openspec`), парсинг `plugin.update-in-progress` через dep `yaml`, возврат `{ old, new } | null`
- [x] 1.5 Добавить зависимость `yaml` в `package.json`

## 2. Промпты обновления и миграций

- [x] 2.1 В `src/lib/prompts.ts` добавить `buildUpdatePrompt({ plugin?, cli? })`: INTRO + опциональный PLUGIN-блок (правка `tui.json` на `@vladislavlad/opencode-openspec-plugin@<next>`, запись `plugin.update-in-progress: { old, new }`, пропуск dev-пути) + опциональный CLI-блок (`npm i -g @fission-ai/openspec@<next>` + `openspec update --force`) + FOOTER (reload, один раз)
- [x] 2.2 Создать `src/lib/migrations.ts` – `MIGRATIONS: Record<version, Migration>`, где `Migration = { instructions, releaseNotes }` + `collectMigrations(old, new)` (диапазон `(old, new]`, с тегом версии)
- [x] 2.3 Добавить `buildMigrationPrompt(range)`: agent-инструкции (`instructions`) из `collectMigrations` + просьба рассказать пользователю что нового (`releaseNotes` по версиям) + шаг «сними `plugin.update-in-progress` из config.yaml»; пустой диапазон → минимальный промпт без шагов

## 3. Интеграция проверки в sidebar

- [x] 3.1 Добавить сигналы `pluginUpdate`, `cliUpdate`, `cliCurrent`, `updateFlag`, `bannerDismissed`, `reloadPending` в `sidebar.tsx`
- [x] 3.2 Проверка версий (`runVersionCheck`) – раз на директорию в dir-эффекте, async/fire-and-forget, не блокирует рендер; `readUpdateFlag` – дёшево на каждом poll в `load()`, чтобы post-update баннер гас после снятия флага
- [x] 3.3 Изменить цвет кнопки Settings: по умолчанию `textMuted`, при hover – `accent`; если доступно обновление плагина или CLI – постоянный `accent`

## 4. UI banner в sidebar

- [x] 4.1 Создать компонент `UpdateBanner` – текст `textMuted` о доступных обновлениях, кнопки Settings (`accent`) и Dismiss (`warn`), разделитель снизу
- [x] 4.2 Интегрировать banner над рядом действий (Explore/Propose), под строкой заголовка; показывать при `pluginUpdate || cliUpdate` и не dismissed
- [x] 4.3 Реализовать dismiss: скрытие banner до следующей перезагрузки данных или Check Versions
- [x] 4.4 Баннер post-update над action buttons: при `updateFlag && flag.new === VERSION` – «Run checks after update» + кнопка Complete Update (`accent`); при `flag.new !== VERSION` – мягкий хинт «reopen opencode to finish update»

## 5. Секция версий в экране Settings

- [x] 5.1 Добавить секцию версий в `settings.tsx`: строки «Plugin version» и «OpenSpec CLI» с current-значениями (CLI → «unknown», если не определена)
- [x] 5.2 При наличии обновления компонента: текст «x.y.z version available» + кнопка Update на той же строке справа, цвет `success` (раздельно для плагина и CLI)
- [x] 5.3 Кнопка Check Versions – вызывает `runVersionCheck(true)` (плагинный fetch, без агента), обновляет сигналы; тост об итоге: `success` «All versions are up to date», либо `warning` «Couldn't reach npm registry»; доступные обновления не тостятся – они уже в UI
- [x] 5.4 Кнопка Update All (цвет `success`) – над разделителем, справа; отображается при наличии хотя бы одного обновления; вызывает `buildUpdatePrompt` только с устаревшими компонентами
- [x] 5.5 Update / Update All → `sendPrompt(api, buildUpdatePrompt(targets), { clear: true, submit: true })`; заблокированы при `busy()` (тост «Wait until the agent finishes working»)
- [x] 5.6 После завершения хода агента (`pendingReload`): показать «Reload opencode to update plugin» + кнопка Reload (`error`) → `quitOpencode`

## 6. Миграции после перезагрузки

- [x] 6.1 Complete Update: читает `updateFlag`, вызывает `buildMigrationPrompt({ old, new })`, отправляет агенту через `sendPrompt` напрямую
- [x] 6.2 Complete Update заблокирован при `busy()` – промпт не отправляется, тост «Wait until the agent finishes working»
- [x] 6.3 После снятия флага агентом: следующий poll видит пустой `plugin.update-in-progress` → `updateFlag` = null, баннер скрывается

## 7. Тестирование и верификация

- [x] 7.1 Проверить, что `fetch` работает в рантайме хоста плагина – подтверждено вживую (дебаг-строка вернула версии из npm) и смоук-тестом; fallback через агента пока не понадобился
- [x] 7.2 Запустить typecheck – без ошибок типов
- [x] 7.3 Собрать плагин (`bun run build`) – сборка проходит, existing тесты (23) зелёные
- [x] 7.4 Отображение баннера/раздельных Update/Update All подтверждено визуально (превью через временный хардкод). Осталось прогнать вживую: блокировку кнопок при `busy()`, полный round-trip Update → reload → Complete Update на реальном обновлении
