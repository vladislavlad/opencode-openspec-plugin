import type { Theme } from "../lib/theme"
import { VERSION } from "../lib/version"

export function SettingsView(props: { theme: Theme }) {
  const t = props.theme

  return (
    <box paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={t().textMuted}>Plugin version</text>
        <text fg={t().text}>{VERSION}</text>
      </box>
    </box>
  )
}
