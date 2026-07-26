import { createSignal, onCleanup, Show } from "solid-js"
import type { CliRenderer, KeyEvent, Renderable } from "@opencode-ai/plugin/tui"
import type { Theme } from "../lib/theme"
import { ClearButton } from "./primitives"

// A one-line search box: click to type, Esc/Enter to leave, "✕" to clear. Focus in opentui is
// exclusive, so focusing this input blurs opencode's prompt — we hand focus back on blur.
export function SearchField(props: {
  theme: Theme
  renderer: CliRenderer
  value: () => string
  onInput: (value: string) => void
  placeholder: string
}) {
  const t = props.theme
  const [focused, setFocused] = createSignal(false)
  const [hover, setHover] = createSignal(false)
  let input: Renderable | undefined
  let previous: Renderable | null = null

  // The renderer is the source of truth: a click on the chat prompt takes focus without telling us,
  // and a stale flag would leave the field lit and ignore the next click on it.
  const sync = (next: Renderable | null) => {
    const mine = next != null && next === input
    setFocused(mine)
    if (!mine) previous = null
  }
  props.renderer.on("focused_renderable", sync)
  onCleanup(() => props.renderer.off("focused_renderable", sync))

  const focus = () => {
    if (!input || input.focused) return
    previous = props.renderer.currentFocusedRenderable
    input.focus()
  }
  const blur = () => {
    if (!input?.focused) return
    const back = previous // `sync` clears it as soon as the input reports the blur
    input.blur()
    back?.focus()
  }
  onCleanup(blur) // the section can collapse while we hold focus

  const active = () => focused() || hover()

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingBottom={1}
      onMouseDown={focus}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <text flexShrink={0} fg={focused() ? t().accent : t().textMuted}>
        ⌕
      </text>
      <input
        ref={(el) => (input = el)}
        flexGrow={1}
        value={props.value()}
        placeholder={props.placeholder}
        placeholderColor={t().textMuted}
        textColor={active() ? t().text : t().textMuted}
        cursorColor={t().accent}
        // Steady: the cursor style is re-sent on every repaint, which restarts a blink mid-phase.
        cursorStyle={{ blinking: false }}
        onInput={props.onInput}
        onSubmit={blur}
        onKeyDown={(key: KeyEvent) => {
          if (key.name !== "escape") return
          key.preventDefault()
          key.stopPropagation()
          blur()
        }}
      />
      <Show when={props.value()}>
        <ClearButton theme={t} onClear={() => props.onInput("")} />
      </Show>
    </box>
  )
}
