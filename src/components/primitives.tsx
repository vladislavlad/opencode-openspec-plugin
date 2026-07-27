import { createSignal, For, Match, Show, Switch, type JSX } from "solid-js"
import type { Color, Theme } from "../lib/theme"

// Greys a button out and diverts the click – spread onto every action that must wait for the agent.
export type Gate = { disabled?: () => boolean; onDisabledClick?: () => void }

// Hover state shared by a list and its rows, so only one row highlights at a time.
export type HoverState = {
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
}

// Hover flag + mouse handlers for one row. Keys are namespaced (`spec:name`) so rows of different
// kinds never share one.
export function rowHover(state: HoverState, key: () => string) {
  return {
    active: () => state.hovered() === key(),
    onMouseOver: () => state.setHovered(() => key()),
    onMouseOut: () => state.setHovered((h) => (h === key() ? null : h)),
  }
}

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

// A box border, not a row of "─": a fixed-length string wraps in a narrow sidebar and the stray tail
// reads as an empty row.
export function Divider(props: { theme: Theme }) {
  return <box width="100%" height={1} border={["top"]} borderColor={props.theme().borderSubtle} />
}

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

// Strips inline bold markers (`**text**`) that the sidebar doesn't render anyway.
function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1")
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

// Renders `\n`-joined text as stacked word-wrapped rows, with `SHALL` highlighted. Inline bold
// markers (`**`) are stripped – the sidebar doesn't render them anyway.
export function Paragraph(props: { theme: Theme; text: string; fg?: Color }) {
  const theme = props.theme
  const base = () => props.fg ?? theme().text
  return (
    <For each={props.text.split("\n")}>
      {(line) => {
        const segments = splitShall(stripBold(line))
        return (
          <box flexDirection="row">
            <text flexGrow={1} wrapMode="word">
              {segments.map((seg) => (
                <span style={{ fg: seg.keyword ? theme().accent : base() }}>{seg.text}</span>
              ))}
            </text>
          </box>
        )
      }}
    </For>
  )
}

const MD_HEADING = /^#{1,6}\s+(.*)$/
const MD_BULLET = /^\s*[-*]\s+(.*)$/
const MD_FENCE = /^\s*(`{3,}|~{3,})/

type MdBlock = { kind: "heading" | "bullet" | "code" | "text"; text: string }

// As much markdown as a 40-column sidebar can carry: headings, bullets, fenced code, prose. Tables,
// links and inline emphasis pass through as plain text – wrapping them here would cost more than it
// buys. One block per line, so blank lines survive as blank rows; a fence collects into one block.
function mdBlocks(content: string): MdBlock[] {
  const blocks: MdBlock[] = []
  let fence: string | null = null
  let code: string[] = []

  for (const raw of content.replace(/\r\n?/g, "\n").split("\n")) {
    const fenceMatch = MD_FENCE.exec(raw)
    if (fence !== null) {
      if (fenceMatch && raw.trim().startsWith(fence)) {
        blocks.push({ kind: "code", text: code.join("\n") })
        fence = null
        code = []
      } else code.push(raw)
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      continue
    }
    const heading = MD_HEADING.exec(raw)
    if (heading) {
      blocks.push({ kind: "heading", text: stripBold(heading[1].trim()) })
      continue
    }
    const bullet = MD_BULLET.exec(raw)
    if (bullet) {
      blocks.push({ kind: "bullet", text: stripBold(bullet[1].trim()) })
      continue
    }
    // Runs of blank lines collapse to one: markdown puts a blank line before every heading, and two
    // of them in a row read as a hole in a sidebar this narrow.
    const previous = blocks[blocks.length - 1]
    if (raw.trim() === "" && previous?.kind === "text" && previous.text.trim() === "") continue
    blocks.push({ kind: "text", text: raw })
  }
  if (fence !== null) blocks.push({ kind: "code", text: code.join("\n") }) // unterminated fence

  // Blank blocks at the edges would render as rows of their own – a file's trailing newline showing
  // up as a gap between one section's body and the next section's header.
  const blank = (b: MdBlock | undefined) => b?.kind === "text" && b.text.trim() === ""
  while (blank(blocks[0])) blocks.shift()
  while (blank(blocks[blocks.length - 1])) blocks.pop()
  return blocks
}

// Renders a markdown artifact (a proposal section, a design doc) as terminal rows.
export function Markdown(props: { theme: Theme; text: string }) {
  const theme = props.theme
  return (
    <For each={mdBlocks(props.text)}>
      {(block) => (
        <Switch fallback={<Paragraph theme={theme} text={block.text} />}>
          {/* No padding of its own – the blank line markdown already puts before a heading is the gap. */}
          <Match when={block.kind === "heading"}>
            <box flexDirection="row">
              <text flexGrow={1} wrapMode="word" style={{ fg: theme().secondary }}>
                <b>{block.text}</b>
              </text>
            </box>
          </Match>
          <Match when={block.kind === "bullet"}>
            <box flexDirection="row" gap={0}>
              <text flexShrink={0} style={{ fg: theme().textMuted }}>{"• "}</text>
              <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
                {block.text}
              </text>
            </box>
          </Match>
          <Match when={block.kind === "code"}>
            <box paddingLeft={2}>
              <For each={block.text.split("\n")}>
                {(line) => (
                  <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
                    {line || " "}
                  </text>
                )}
              </For>
            </box>
          </Match>
        </Switch>
      )}
    </For>
  )
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
