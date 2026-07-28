## 1. Bake version at build time

- [x] 1.1 Add `define: { "__PLUGIN_VERSION__": JSON.stringify(pkg.version) }` to `build.ts`
- [x] 1.2 Create `src/lib/version.ts` with constant `VERSION = typeof __PLUGIN_VERSION__ !== 'undefined' ? __PLUGIN_VERSION__ : 'dev'`

## 2. Version hover hint across entire header row

- [x] 2.1 Move `onMouseOver`/`onMouseOut` to the outer `<box>` of the header row (not just on "OpenSpec" text)
- [x] 2.2 On hover, show version inline to the right of "OpenSpec" in `textMuted` color; hide when cursor leaves

## 3. Settings button with color tied to row hover

- [x] 3.1 Add signal `showSettings` in sidebar.tsx
- [x] 3.2 Button color: default `textMuted`, on header row hover – `warning`
- [x] 3.3 On click, set `showSettings(true)`

## 4. Settings screen

- [x] 4.1 Redesign `SettingsView`: "Settings" header in `warning` color, spacing instead of divider, "Plugin version" line on the left + version on the right
- [x] 4.2 Add `<Show when={showSettings()}>` in sidebar.tsx before main content, rendering `SettingsView` with `onBack={() => setShowSettings(false)}`
