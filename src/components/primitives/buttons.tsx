import { createSignal } from "solid-js"
import type { Theme } from "../../lib/theme"
import { Button } from "./button"

export function BackButton(props: { theme: Theme; onBack: () => void }) {
  return <Button theme={props.theme} label="← back" color={props.theme().accent} onClick={props.onBack} />
}

// The "✕" that empties a search field.
export function ClearButton(props: { theme: Theme; onClear: () => void }) {
  const [hover, setHover] = createSignal(false)
  const t = props.theme
  return (
    <box
      flexShrink={0}
      paddingRight={1}
      backgroundColor={hover() ? t().accent : undefined}
      onMouseDown={props.onClear}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <text fg={hover() ? t().background : t().textMuted}>✕</text>
    </box>
  )
}
