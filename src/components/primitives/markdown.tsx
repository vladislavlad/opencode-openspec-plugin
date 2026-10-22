import { For, Match, Switch } from "solid-js"
import type { Theme } from "../../lib/theme"
import { Paragraph } from "./paragraph"

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

// Strips inline bold markers (`**text**`) that the sidebar doesn't render anyway.
function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1")
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
