import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"

// Accessor for the live theme; passed to every component as `theme`.
export type Theme = () => TuiThemeCurrent
