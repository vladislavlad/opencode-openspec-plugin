import { For } from "solid-js"
import type { Color, Theme } from "../../lib/theme"

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
