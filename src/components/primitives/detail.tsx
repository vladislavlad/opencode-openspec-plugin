import type { Color, Theme } from "../../lib/theme"
import { BackButton } from "./buttons"
import { Divider } from "./layout"

// Every detail screen goes through this, so they all sit at the same height.
export function DetailHeader(props: { theme: Theme; label: string; onBack: () => void; color?: Color }) {
  const theme = props.theme
  return (
    <box paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.color ?? theme().accent}>
          <b>{props.label}</b>
        </text>
        <BackButton theme={theme} onBack={props.onBack} />
      </box>
      <Divider theme={theme} />
    </box>
  )
}
