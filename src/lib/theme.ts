import type { Context } from "@opencode/plugin/tui/context"
import type { RGBA } from "@opentui/core"

export type Color = string | RGBA
export interface ThemeColors {
  text: Color
  textMuted: Color
  primary: Color
  secondary: Color
  accent: Color
  success: Color
  warning: Color
  error: Color
  background: Color
  borderSubtle: Color
}
export type Theme = () => ThemeColors

// Resolve live V2 tokens at render time so theme changes stay reactive. Native action text
// describes foregrounds on action surfaces and can be neutral; our text buttons use hue colors.
export function themeColors(theme: Context["theme"]): ThemeColors {
  return {
    text: theme.text.base,
    textMuted: theme.text.muted,
    primary: theme.hue.interactive[200],
    secondary: theme.hue.interactive[200],
    accent: theme.hue.accent[200],
    success: theme.text.feedback.success.base,
    warning: theme.text.feedback.warning.base,
    error: theme.text.feedback.error.base,
    background: theme.background.base,
    borderSubtle: theme.border.base,
  }
}
