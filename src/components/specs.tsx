import { createMemo, createSignal, For, Show } from "solid-js"
import type { CliRenderer } from "@opencode-ai/plugin/tui"
import type { OpenSpecSpec, Requirement, Scenario } from "../lib/openspec"
import { searchRequirements } from "../lib/search"
import type { Theme } from "../lib/theme"
import { DetailHeader, Divider, Paragraph } from "./primitives"
import { SearchField } from "./search"

// A single spec row in the Specifications list; hover highlight + click to open. With
// `matchedRequirements` the row reports how many matched instead of the plain total.
export function SpecRow(props: {
  theme: Theme
  spec: OpenSpecSpec
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onSelect: (name: string) => void
  matchedRequirements?: number
}) {
  const theme = props.theme
  const spec = () => props.spec
  // Namespaced so a spec never shares a hover key with a same-named change row.
  const key = () => `spec:${spec().name}`
  const hover = () => props.hovered() === key()
  const meta = () => {
    const matched = props.matchedRequirements ?? 0
    return matched > 0 ? `  ${matched} matching requirements` : `  ${spec().requirements.length} requirements`
  }
  return (
    <box>
      <box
        width="100%"
        backgroundColor={hover() ? theme().textMuted : undefined}
        onMouseDown={() => props.onSelect(spec().name)}
        onMouseOver={() => props.setHovered(() => key())}
        onMouseOut={() => props.setHovered((h) => (h === key() ? null : h))}
      >
        <text>
          <span style={{ fg: theme().accent }}>▪ </span>
          <span style={{ fg: theme().text }}>{spec().name}</span>
        </text>
        <text fg={hover() ? theme().text : theme().textMuted}>{meta()}</text>
      </box>
    </box>
  )
}

// A clickable requirement row inside a spec's detail view; `matchedScenarios` works like
// `matchedRequirements` above.
function RequirementRow(props: {
  theme: Theme
  req: Requirement
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onSelect: (name: string) => void
  matchedScenarios?: number
}) {
  const theme = props.theme
  const req = () => props.req
  // Namespaced so a requirement never shares a hover key with a same-named change/spec row.
  const key = () => `req:${req().name}`
  const hover = () => props.hovered() === key()
  const meta = () => {
    const matched = props.matchedScenarios ?? 0
    return matched > 0 ? `  ${matched} matching scenarios` : `  ${req().scenarios.length} scenarios`
  }
  return (
    <box
      width="100%"
      backgroundColor={hover() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(req().name)}
      onMouseOver={() => props.setHovered(() => key())}
      onMouseOut={() => props.setHovered((h) => (h === key() ? null : h))}
    >
      <box flexDirection="row" gap={0}>
        <text flexShrink={0} style={{ fg: theme().accent }}>{"› "}</text>
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
          {req().name}
        </text>
      </box>
      <text fg={hover() ? theme().text : theme().textMuted}>{meta()}</text>
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

// A `- **WHEN** …` bullet rendered with the keyword in accent; other lines pass through muted.
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

// Requirement detail: name + description and the list of foldable scenarios.
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
