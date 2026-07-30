import { createMemo, createSignal, For, Show } from "solid-js"
import type { CliRenderer } from "@opencode-ai/plugin/tui"
import type { OpenSpecSpec, Requirement, Scenario } from "../lib/openspec"
import { searchRequirements } from "../lib/search"
import type { Theme } from "../lib/theme"
import { BackButton, DetailHeader, Divider, Paragraph, rowHover, type HoverState } from "./primitives"
import { SearchField } from "./search"

// With `matched` a row reports how many children the search hit instead of the plain total.
const rowMeta = (matched: number | undefined, total: number, noun: string) =>
  matched ? `  ${matched} matching ${noun}` : `  ${total} ${noun}`

// A spec's name is its path from `specs/` – the CLI's id. The last segment is what a row shows once
// the node around it has already named the area.
const leaf = (path: string) => path.slice(path.lastIndexOf("/") + 1)

// One level of the Specifications tree: the areas directly under it and the capabilities that sit
// here rather than in an area. `total` counts specs at any depth, which is what an area row reports.
export interface SpecNode {
  path: string // "" at the root
  name: string // last segment of `path`; "" at the root
  areas: SpecNode[]
  specs: OpenSpecSpec[]
  total: number
}

// Grouping is a function of the names, never something the summary carries: a spec called
// `backend/auth` puts itself under `backend`. Areas and capabilities are each sorted by name.
export function buildTree(specs: readonly OpenSpecSpec[]): SpecNode {
  const build = (entries: { rest: string[]; spec: OpenSpecSpec }[], path: string): SpecNode => {
    const own: OpenSpecSpec[] = []
    const groups = new Map<string, { rest: string[]; spec: OpenSpecSpec }[]>()
    for (const entry of entries) {
      if (entry.rest.length <= 1) {
        own.push(entry.spec)
        continue
      }
      const [head, ...rest] = entry.rest
      const bucket = groups.get(head)
      if (bucket) bucket.push({ rest, spec: entry.spec })
      else groups.set(head, [{ rest, spec: entry.spec }])
    }
    const areas = [...groups]
      .map(([segment, bucket]) => build(bucket, path ? `${path}/${segment}` : segment))
      .sort((a, b) => a.name.localeCompare(b.name))
    own.sort((a, b) => a.name.localeCompare(b.name))
    return { path, name: leaf(path), areas, specs: own, total: own.length + areas.reduce((n, a) => n + a.total, 0) }
  }
  return build(specs.map((spec) => ({ rest: spec.name.split("/"), spec })), "")
}

// The node at `path`, or null when the area is gone – files can move between polls.
export function findNode(root: SpecNode, path: string): SpecNode | null {
  let node = root
  for (const segment of path ? path.split("/") : []) {
    const next = node.areas.find((a) => a.name === segment)
    if (!next) return null
    node = next
  }
  return node
}

// The area one level up; "" from a top-level area, i.e. back to the root.
export const parentArea = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")))

// A spec row in the Specifications list; hover highlight + click to open. `showPath` is for lists
// drawn without a node around them – search results, where two areas can each hold an `auth`.
export function SpecRow(props: HoverState & { theme: Theme; spec: OpenSpecSpec; onSelect: (name: string) => void; matchedRequirements?: number; showPath?: boolean }) {
  const theme = props.theme
  const spec = () => props.spec
  const hover = rowHover(props, () => `spec:${spec().name}`)
  return (
    <box
      width="100%"
      backgroundColor={hover.active() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(spec().name)}
      onMouseOver={hover.onMouseOver}
      onMouseOut={hover.onMouseOut}
    >
      <text>
        <span style={{ fg: theme().accent }}>▪ </span>
        <span style={{ fg: theme().text }}>{props.showPath ? spec().name : leaf(spec().name)}</span>
      </text>
      <text fg={hover.active() ? theme().text : theme().textMuted}>
        {rowMeta(props.matchedRequirements, spec().requirements.length, "requirements")}
      </text>
    </box>
  )
}

// An area row, shaped like a spec row so the two lists read as one.
export function AreaRow(props: HoverState & { theme: Theme; area: SpecNode; onSelect: (path: string) => void }) {
  const theme = props.theme
  const area = () => props.area
  const hover = rowHover(props, () => `area:${area().path}`)
  return (
    <box
      width="100%"
      backgroundColor={hover.active() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(area().path)}
      onMouseOver={hover.onMouseOver}
      onMouseOut={hover.onMouseOut}
    >
      <text>
        <span style={{ fg: theme().accent }}>▪ </span>
        <span style={{ fg: theme().text }}>{area().name}</span>
      </text>
      <text fg={hover.active() ? theme().text : theme().textMuted}>
        {rowMeta(undefined, area().total, "capabilities")}
      </text>
    </box>
  )
}

// Shaped like a section header, one level down. `spaced` separates it from the list above; the first
// heading needs none, because whatever sits above the node – the search field, the area header –
// already carries a blank line of its own.
function SubHeading(props: { theme: Theme; label: string; count: number; spaced?: boolean }) {
  const theme = props.theme
  return (
    <box paddingTop={props.spaced ? 1 : 0}>
      <text>
        <b>
          <span style={{ fg: theme().accent }}>{`${props.label}: `}</span>
          <span style={{ fg: theme().text }}>{String(props.count)}</span>
        </b>
      </text>
    </box>
  )
}

// Names the area being shown and carries the way out of it. The label keeps the back button company
// on one row; the path gets a row of its own, shaped like the row that was clicked to get here – a
// nested path is long enough to wrap into the button otherwise.
function AreaHeader(props: { theme: Theme; path: string; onBack: () => void }) {
  const theme = props.theme
  return (
    <box>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().accent}>
          <b>Area</b>
        </text>
        <BackButton theme={theme} onBack={props.onBack} />
      </box>
      <box flexDirection="row" gap={0} paddingBottom={1}>
        <text flexShrink={0} style={{ fg: theme().accent }}>{"▪ "}</text>
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
          {props.path}
        </text>
      </box>
    </box>
  )
}

// One level of the tree. The root of a project with no areas is a plain list: nothing is divided, so
// nothing is labelled. Once an area exists – beside this level or around it – the groups get their
// headings, which falls out of the node rather than being a case of its own.
//
// The header comes off the node too, so it can only ever name the area actually being rendered: an
// area that vanished between polls leaves its caller showing the root, and the root has no header.
export function SpecNodeView(props: HoverState & {
  theme: Theme
  node: SpecNode
  onSelectArea: (path: string) => void
  onSelectSpec: (name: string) => void
  onBack: () => void
}) {
  const theme = props.theme
  const node = () => props.node
  const grouped = () => node().areas.length > 0
  const labelled = () => grouped() || node().path !== ""
  return (
    <box>
      <Show when={node().path}>
        <AreaHeader theme={theme} path={node().path} onBack={props.onBack} />
      </Show>
      <Show when={grouped()}>
        <SubHeading theme={theme} label="Areas" count={node().areas.length} />
        <For each={node().areas}>
          {(area) => (
            <AreaRow
              theme={theme}
              area={area}
              hovered={props.hovered}
              setHovered={props.setHovered}
              onSelect={props.onSelectArea}
            />
          )}
        </For>
      </Show>
      <Show when={labelled() && node().specs.length > 0}>
        <SubHeading theme={theme} label="Capabilities" count={node().specs.length} spaced={grouped()} />
      </Show>
      <For each={node().specs}>
        {(spec) => (
          <SpecRow
            theme={theme}
            spec={spec}
            hovered={props.hovered}
            setHovered={props.setHovered}
            onSelect={props.onSelectSpec}
          />
        )}
      </For>
    </box>
  )
}

// A requirement row inside a spec's detail view.
function RequirementRow(props: HoverState & { theme: Theme; req: Requirement; onSelect: (name: string) => void; matchedScenarios?: number }) {
  const theme = props.theme
  const req = () => props.req
  const hover = rowHover(props, () => `req:${req().name}`)
  return (
    <box
      width="100%"
      backgroundColor={hover.active() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(req().name)}
      onMouseOver={hover.onMouseOver}
      onMouseOut={hover.onMouseOut}
    >
      <box flexDirection="row" gap={0}>
        <text flexShrink={0} style={{ fg: theme().accent }}>{"› "}</text>
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
          {req().name}
        </text>
      </box>
      <text fg={hover.active() ? theme().text : theme().textMuted}>
        {rowMeta(props.matchedScenarios, req().scenarios.length, "scenarios")}
      </text>
    </box>
  )
}

// Spec overview: capability name, optional Purpose, and a filtered requirements list. The query is
// the sidebar's, so it carries in from the list view and survives going back.
export function SpecDetail(props: {
  theme: Theme
  spec: OpenSpecSpec
  renderer: CliRenderer
  query: () => string
  onQuery: (value: string) => void
  onOpenReq: (name: string) => void
  onBack: () => void
}) {
  const theme = props.theme
  const spec = () => props.spec
  const [hovered, setHovered] = createSignal<string | null>(null)
  const matches = createMemo(() => searchRequirements(spec().requirements, props.query()))
  return (
    <box>
      <DetailHeader theme={theme} label="Specification" onBack={props.onBack} />
      <text>
        <span style={{ fg: theme().accent }}>▪ </span>
        <span style={{ fg: theme().text }}>{spec().name}</span>
      </text>
      <Show when={spec().purpose}>
        <box paddingTop={1}>
          <text fg={theme().accent}>
            <b>Purpose</b>
          </text>
          <Paragraph theme={theme} text={spec().purpose} />
        </box>
      </Show>
      <box paddingTop={1}>
        <text>
          <b>
            <span style={{ fg: theme().accent }}>Requirements: </span>
            <span style={{ fg: theme().text }}>{matches().length}</span>
          </b>
        </text>
        <Divider theme={theme} />
        <SearchField
          theme={theme}
          renderer={props.renderer}
          value={props.query}
          onInput={props.onQuery}
          placeholder="Search requirements"
        />
        <Show
          when={matches().length > 0}
          fallback={
            <text fg={theme().textMuted}>{spec().requirements.length === 0 ? "  No requirements" : "  No matches"}</text>
          }
        >
          <For each={matches()}>
            {(match) => (
              <RequirementRow
                theme={theme}
                req={match.req}
                hovered={hovered}
                setHovered={setHovered}
                onSelect={props.onOpenReq}
                matchedScenarios={match.matchedScenarios}
              />
            )}
          </For>
        </Show>
      </box>
    </box>
  )
}

// A `- **WHEN** …` bullet renders with the keyword in accent; other lines pass through muted.
const SCENARIO_BULLET = /^[-*]\s+\*\*(.+?)\*\*\s*(.*)$/

function ScenarioLine(props: { theme: Theme; raw: string }) {
  const theme = props.theme
  const parts = () => SCENARIO_BULLET.exec(props.raw.trim())
  return (
    <Show
      when={parts()}
      fallback={
        <box flexDirection="row">
          <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
            {props.raw.trim()}
          </text>
        </box>
      }
    >
      {(m) => (
        <box flexDirection="row">
          <text flexGrow={1} wrapMode="word">
            <span style={{ fg: theme().accent }}>{`${m()[1]} `}</span>
            <span style={{ fg: theme().text }}>{m()[2]}</span>
          </text>
        </box>
      )}
    </Show>
  )
}

// One foldable scenario: click the title to reveal its When/Then body.
function ScenarioFold(props: { theme: Theme; scenario: Scenario; defaultOpen?: boolean }) {
  const theme = props.theme
  const scenario = () => props.scenario
  const [open, setOpen] = createSignal(props.defaultOpen ?? false)
  const [hover, setHover] = createSignal(false)
  return (
    <box>
      <box
        flexDirection="row"
        gap={1}
        backgroundColor={hover() ? theme().textMuted : undefined}
        onMouseDown={() => setOpen((x) => !x)}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      >
        <text flexShrink={0} fg={theme().text}>{open() ? "▼" : "▶"}</text>
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().secondary }}>
          {scenario().name}
        </text>
      </box>
      <Show when={open()}>
        <box paddingLeft={2} paddingBottom={1}>
          <For each={scenario().lines}>{(line) => <ScenarioLine theme={theme} raw={line} />}</For>
        </box>
      </Show>
    </box>
  )
}

export function RequirementDetail(props: { theme: Theme; req: Requirement; onBack: () => void }) {
  const theme = props.theme
  const req = () => props.req
  return (
    <box>
      <DetailHeader theme={theme} label="Requirement" onBack={props.onBack} />
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word">
          <b>
            <span style={{ fg: theme().accent }}>{req().name}</span>
          </b>
        </text>
      </box>
      <Show when={req().description}>
        <Paragraph theme={theme} text={req().description} />
      </Show>
      <box paddingTop={1}>
        <text>
          <b>
            <span style={{ fg: theme().accent }}>Scenarios: </span>
            <span style={{ fg: theme().text }}>{req().scenarios.length}</span>
          </b>
        </text>
        <Divider theme={theme} />
        <Show when={req().scenarios.length > 0} fallback={<text fg={theme().textMuted}>{"  No scenarios"}</text>}>
          <For each={req().scenarios}>
            {(sc) => <ScenarioFold theme={theme} scenario={sc} defaultOpen={req().scenarios.length < 4} />}
          </For>
        </Show>
      </box>
    </box>
  )
}
