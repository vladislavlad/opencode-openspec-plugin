import { createSignal, For, Show, type JSX } from "solid-js"
import type { Theme } from "../lib/theme"

// Progress bar for `done`/`total`; renders nothing when there are no tasks. `muted` overrides the
// dim colour (used on hover so the whole row lights up).
export function ProgressBar(props: { theme: Theme; done: number; total: number; muted?: string }) {
  const percent = () => Math.round((props.done / props.total) * 100)
  const filled = () => Math.round((props.done / props.total) * 24)
  const muted = () => props.muted ?? props.theme().textMuted
  return (
    <Show when={props.total > 0}>
      <text>
        <span style={{ fg: muted() }}>{`  [`}</span>
        <span style={{ fg: props.theme().success }}>{"█".repeat(filled())}</span>
        <span style={{ fg: muted() }}>{`${"░".repeat(24 - filled())}] ${percent()}%`}</span>
      </text>
    </Show>
  )
}

// A small clickable button; fills its background with `color` on hover.
export function Button(props: { theme: Theme; label: string; color: string; onClick: () => void }) {
  const [hover, setHover] = createSignal(false)
  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={hover() ? props.color : undefined}
      onMouseDown={props.onClick}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <text fg={hover() ? props.theme().background : props.color}>{props.label}</text>
    </box>
  )
}

// The thin rule used to separate sections and headers across the sidebar.
export function Divider(props: { theme: Theme }) {
  return <text fg={props.theme().borderSubtle}>─────────────────────────────────────</text>
}

// A detail-view header: bold accent label on the left, a clickable "← back" on the right.
export function DetailHeader(props: { theme: Theme; label: string; onBack: () => void }) {
  const theme = props.theme
  const [backHover, setBackHover] = createSignal(false)
  return (
    <box paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().accent}>
          <b>{props.label}</b>
        </text>
        <box
          backgroundColor={backHover() ? theme().textMuted : undefined}
          onMouseDown={props.onBack}
          onMouseOver={() => setBackHover(true)}
          onMouseOut={() => setBackHover(false)}
        >
          <text fg={theme().accent}>← back</text>
        </box>
      </box>
      <Divider theme={theme} />
    </box>
  )
}

// Renders a `\n`-joined block as stacked word-wrapped rows; blank lines become spacers.
export function Paragraph(props: { theme: Theme; text: string; fg?: string }) {
  const theme = props.theme
  return (
    <For each={props.text.split("\n")}>
      {(line) => (
        <box flexDirection="row">
          <text flexGrow={1} wrapMode="word" style={{ fg: props.fg ?? theme().text }}>
            {line || " "}
          </text>
        </box>
      )}
    </For>
  )
}

// A collapsible sidebar section: a "▼/▶ Label: count" header that reveals its children when open.
export function CollapsibleSection(props: {
  theme: Theme
  open: () => boolean
  onToggle: () => void
  label: string
  labelColor: string
  count: number
  children: JSX.Element
}) {
  const theme = props.theme
  return (
    <box paddingTop={1}>
      <box flexDirection="row" gap={1} onMouseDown={props.onToggle}>
        <text fg={theme().text}>{props.open() ? "▼" : "▶"}</text>
        <text>
          <b>
            <span style={{ fg: props.labelColor }}>{`${props.label}: `}</span>
            <span style={{ fg: theme().text }}>{props.count}</span>
          </b>
        </text>
      </box>
      <Show when={props.open()}>
        <Divider theme={theme} />
        {props.children}
      </Show>
    </box>
  )
}

// Shown when the project has no openspec/ dir or is missing the opencode tooling.
export function NotInitialised(props: { theme: Theme; onInit: () => void }) {
  const theme = props.theme
  return (
    <box>
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
          Not initialized for this project
        </text>
      </box>
      <box flexDirection="row" paddingTop={1}>
        <Button theme={theme} label="Init" color={theme().secondary} onClick={props.onInit} />
      </box>
    </box>
  )
}
