## 1. Вшивка версии при сборке

- [x] 1.1 Добавить `define: { "__PLUGIN_VERSION__": JSON.stringify(pkg.version) }` в `build.ts`
- [x] 1.2 Создать `src/lib/version.ts` с константой `VERSION = typeof __PLUGIN_VERSION__ !== 'undefined' ? __PLUGIN_VERSION__ : 'dev'`

## 2. Hover-подсказка версии на всю строку заголовка

- [x] 2.1 Переместить `onMouseOver`/`onMouseOut` на внешний `<box>` строки заголовка (не только на текст «OpenSpec»)
- [x] 2.2 При hover показывать версию inline справа от «OpenSpec» цветом `textMuted`, скрывать при уходе курсора

## 3. Кнопка Settings с привязкой цвета к hover строки

- [x] 3.1 Добавить signal `showSettings` в sidebar.tsx
- [x] 3.2 Цвет кнопки: по умолчанию `textMuted`, при hover строки заголовка – `warning`
- [x] 3.3 По клику на Settings устанавливать `showSettings(true)`

## 4. Экран Settings

- [x] 4.1 Переработать `SettingsView`: заголовок «Settings» цветом `warning`, отступ вместо divider, строка «Plugin version» слева + версия справа
- [x] 4.2 Добавить `<Show when={showSettings()}>` в sidebar.tsx перед основным контентом, рендерящий `SettingsView` с `onBack={() => setShowSettings(false)}`
