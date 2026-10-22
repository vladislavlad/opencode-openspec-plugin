import type { Theme } from "../../lib/theme"
import { Button } from "./button"
import type { Gate } from "./gate"

// Shown when the project has no openspec/ dir or is missing the opencode tooling.
export function NotInitialised(props: { theme: Theme; onInit: () => void; gate: Gate }) {
  const theme = props.theme
  return (
    <box>
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
          Not initialized for this project
        </text>
      </box>
      <box flexDirection="row" paddingTop={1}>
        <Button theme={theme} label="Init" color={theme().secondary} {...props.gate} onClick={props.onInit} />
      </box>
    </box>
  )
}
