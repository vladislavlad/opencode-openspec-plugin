import { createSignal, For, Show, type JSX } from "solid-js"
import type { Color, Theme } from "../lib/theme"

// Progress bar for `done`/`total`; nothing when there are no tasks. `muted` overrides the dim colour.
export function ProgressBar(props: { theme: Theme; done: number; total: number; muted?: Color }) {
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

// Clickable button; fills its background with `color` on hover. `disabled` renders it muted and
// routes clicks to `onDisabledClick` (used to block actions while the agent is busy).
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

// Splits a line so `SHALL` (OpenSpec's requirement keyword) can be coloured separately.
function splitShall(line: string): { text: string; keyword: boolean }[] {
  const parts: { text: string; keyword: boolean }[] = []
  const re = /\bSHALL\b/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), keyword: false })
    parts.push({ text: m[0], keyword: true })
    last = m.index + m[0].length
  }
  if (last < line.length) parts.push({ text: line.slice(last), keyword: false })
  return parts.length ? parts : [{ text: line || " ", keyword: false }]
}

// Renders `\n`-joined text as stacked word-wrapped rows; highlights the `SHALL` keyword in accent.
export function Paragraph(props: { theme: Theme; text: string; fg?: Color }) {
  const theme = props.theme
  const base = () => props.fg ?? theme().text
  return (
    <For each={props.text.split("\n")}>
      {(line) => (
        <box flexDirection="row">
          <text flexGrow={1} wrapMode="word">
            {splitShall(line).map((seg) => (
              <span style={{ fg: seg.keyword ? theme().accent : base() }}>{seg.text}</span>
            ))}
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
  labelColor: Color
  count: number
  children: JSX.Element
  // Optional preview rendered under the header while the section is collapsed.
  collapsedSummary?: JSX.Element
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
      <Show when={props.open()} fallback={props.collapsedSummary}>
        <Divider theme={theme} />
        {props.children}
      </Show>
    </box>
  )
}

// Shown when the project has no openspec/ dir or is missing the opencode tooling.
export function NotInitialised(props: {
  theme: Theme
  onInit: () => void
  disabled?: () => boolean
  onDisabledClick?: () => void
}) {
  const theme = props.theme
  return (
    <box>
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
          Not initialized for this project
        </text>
      </box>
      <box flexDirection="row" paddingTop={1}>
        <Button
          theme={theme}
          label="Init"
          color={theme().secondary}
          disabled={props.disabled}
          onDisabledClick={props.onDisabledClick}
          onClick={props.onInit}
        />
      </box>
    </box>
  )
}
