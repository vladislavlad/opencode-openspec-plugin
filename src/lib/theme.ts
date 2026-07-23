import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"

// A theme colour — @opentui uses RGBA (`ColorInput = string | RGBA`), accepted by TUI intrinsics.
export type Color = TuiThemeCurrent["text"] | string

// Accessor for the live theme; passed to every component as `theme`.
export type Theme = () => TuiThemeCurrent
