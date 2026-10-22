import { Show, type JSX } from "solid-js"
import type { Color, Theme } from "../../lib/theme"

// Progress bar for `done`/`total`; nothing when there are no tasks. `muted` overrides the dim colour.
export function ProgressBar(props: { theme: Theme; done: number; total: number; muted?: Color; showNumberOfTasks?: boolean }) {
  const percent = () => Math.round((props.done / props.total) * 100)
  const filled = () => Math.round((props.done / props.total) * 24)
  const muted = () => props.muted ?? props.theme().textMuted
  return (
    <Show when={props.total > 0}>
      <Show when={props.showNumberOfTasks}>
        <text fg={muted()}>{`${props.done}/${props.total} tasks done`}</text>
      </Show>
      <text>
        <span style={{ fg: muted() }}>{`[`}</span>
        <span style={{ fg: props.theme().success }}>{"█".repeat(filled())}</span>
        <span style={{ fg: muted() }}>{`${"░".repeat(24 - filled())}] ${percent()}%`}</span>
      </text>
    </Show>
  )
}

// A box border, not a row of "─": a fixed-length string wraps in a narrow sidebar and the stray tail
// reads as an empty row.
export function Divider(props: { theme: Theme }) {
  return <box width="100%" height={1} border={["top"]} borderColor={props.theme().borderSubtle} />
}

// A "▼/▶ Label: count" header that reveals its children when open. `count` is optional – a section
// whose contents aren't countable (a proposal, a design doc) shows the bare label.
export function CollapsibleSection(props: {
  theme: Theme
  open: () => boolean
  onToggle: () => void
  label: string
  labelColor: Color
  count?: { done: number; total: number } | number
  children: JSX.Element
  collapsedSummary?: JSX.Element // preview rendered under the header while collapsed
}) {
  const theme = props.theme
  const counted = () => props.count !== undefined
  const countText = () => {
    if (!counted()) return ""
    const c = props.count!
    return typeof c === "number" ? String(c) : `${c.done}/${c.total}`
  }
  return (
    <box paddingTop={1}>
      <box flexDirection="row" gap={1} onMouseDown={props.onToggle}>
        <text fg={theme().text}>{props.open() ? "▼" : "▶"}</text>
        <text>
          <b>
            <span style={{ fg: props.labelColor }}>{counted() ? `${props.label}: ` : props.label}</span>
            <span style={{ fg: theme().text }}>{countText()}</span>
          </b>
        </text>
      </box>
      <Show when={props.open()}>
        <Divider theme={theme} />
        {props.children}
      </Show>
      <Show when={!props.open() && props.collapsedSummary}>
        <box onMouseDown={props.onToggle}>{props.collapsedSummary}</box>
      </Show>
    </box>
  )
}
