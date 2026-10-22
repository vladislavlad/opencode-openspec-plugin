import { createSignal } from "solid-js"
import type { Color, Theme } from "../../lib/theme"

// Clickable button; fills its background with `color` on hover. `disabled` renders it muted and
// routes clicks to `onDisabledClick`.
export function Button(props: {
  theme: Theme
  label: string
  color: Color
  onClick: () => void
  disabled?: () => boolean
  onDisabledClick?: () => void
}) {
  const [hover, setHover] = createSignal(false)
  const theme = props.theme
  const disabled = () => props.disabled?.() ?? false
  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={hover() ? (disabled() ? theme().textMuted : props.color) : undefined}
      onMouseDown={() => (disabled() ? props.onDisabledClick?.() : props.onClick())}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <text fg={hover() ? (disabled() ? theme().text : theme().background) : disabled() ? theme().textMuted : props.color}>
        {props.label}
      </text>
    </box>
  )
}
