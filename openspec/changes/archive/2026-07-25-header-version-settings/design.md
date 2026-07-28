## Context

The sidebar header in `src/sidebar.tsx` (lines 193-196) is a simple `<text>` with bold "OpenSpec". The plugin version is stored in `package.json` (`"version": "0.2.0"`). Navigation between views is managed by SolidJS signals (`selected`, `selectedSpec`, `selectedReq`) and nested `<Show>` blocks.

## Goals / Non-Goals

**Goals:**
- Show the plugin version on hover over the "OpenSpec" header
- Add a Settings button on the right in the header
- Implement a Settings view with version display and back button

**Non-Goals:**
- Additional settings – only version as a placeholder
- Changes to existing view navigation

## Decisions

### Version from build-time define
The version is baked at build time via the `define` option of Bun.build: `__PLUGIN_VERSION__: JSON.stringify(pkg.version)`. In code, a constant with fallback: `const VERSION = typeof __PLUGIN_VERSION__ !== 'undefined' ? __PLUGIN_VERSION__ : 'dev'`.

**Alternatives considered:** Runtime import of package.json – excessive, the version is static. Hardcoding in file – requires manual update on every release.

### Version hover hint across entire row
The entire header row (`<box flexDirection="row">`) receives `onMouseOver`/`onMouseOut`. On hover, the version is shown inline next to "OpenSpec" (color `textMuted`). The Settings button changes color: default `textMuted`, on row hover – `warn`.

**Alternatives considered:** Hover only on the "OpenSpec" text – less convenient because the clickable area is narrow.

### Settings view as a signal
A `showSettings` signal is added in sidebar.tsx. `<Show when={showSettings()}>` is inserted into the fallback chain before main content so that Settings overlays all views.

**Alternatives considered:** A separate route – excessive for a single screen. Signal-based approach matches existing architecture.

### Settings button
Uses the existing `Button` component from primitives.tsx. Color is tied to the row hover signal: default `textMuted`, on header row hover – `warn`.

### Settings screen layout
Header "Settings" – color `warn`, no divider (spacing instead of separator). Version line: "Plugin version" on the left, value (`0.2.0`) on the right on one line.

## Risks / Trade-offs

[Hover may conflict with header click] → The header is not clickable, no conflict.
[TUI mouse events may be limited] → Use the same handlers as in `Button` (primitives.tsx:34-46).
