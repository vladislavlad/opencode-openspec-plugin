import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createEffect, createMemo, For, Show, createSignal, onCleanup } from "solid-js"
import {
  readOpenSpec,
  hasOpenSpecTooling,
  isComplete,
  isGroupComplete,
  summaryEquals,
  type FileClient,
  type OpenSpecChange,
  type OpenSpecSpec,
  type OpenSpecSummary,
  type Requirement,
  type Scenario,
} from "./openspec"

// The shell command that installs OpenSpec + the opencode command/skill tooling.
const OPENSPEC_INIT_CMD = `npx -y @fission-ai/openspec@latest init --tools opencode`

// Prompt submitted by the `/opsx-baseline` command (and reused by the Init flow). Built from an
// array so the ``` code fences inside it don't terminate a template literal. It tells the model to
// reverse-engineer OpenSpec specs from the existing implementation — high-level capabilities only,
// phased with per-capability subagents so a small local model never holds the whole repo at once.
const SPEC_BASELINE_PROMPT = [
  "Derive OpenSpec specifications from this project's existing implementation, capturing what the codebase does today. Write specs, never changes, never code.",
  "",
  "A spec = ONE HIGH-LEVEL business capability — what the product does for its users (e.g. `authentication`, `billing`, `notifications`) — NOT an individual file, function, UI widget, or minor utility. Aim for a SMALL set of capabilities (usually 3-8). When in doubt, group into fewer, broader capabilities.",
  "",
  "Each capability is one file `openspec/specs/<capability>/spec.md` (kebab-case name), in this exact shape:",
  "",
  "```",
  "## Purpose",
  "<1-2 sentences: what this capability does for users>",
  "",
  "## Requirements",
  "",
  "### Requirement: <Short Name>",
  "The system SHALL <a single, verifiable behavior the code implements>.",
  "",
  "#### Scenario: <Short Name>",
  "- **WHEN** <trigger>",
  "- **THEN** <observable outcome>",
  "```",
  "",
  "Every requirement uses **SHALL** and has at least one `#### Scenario:` with `- **WHEN**` / `- **THEN**` bullets. Keep requirements atomic.",
  "",
  "Work in phases so the whole codebase is never in context at once (important - this may run on a small local model):",
  "",
  "**Phase 1 - Orient (shallow, keep it light).**",
  "Skim only high-signal sources: README/docs, top-level folders, package manifests, main entry points, and route/handler registrations. Do NOT open every file. Produce a short list of the main business capabilities - for each: a kebab-case name, a one-line purpose, and the few paths/dirs where its code lives.",
  "",
  "**Phase 2 - Detail each capability (isolated context, one at a time).**",
  'For EACH capability from Phase 1, dispatch a separate subagent with the Task tool (subagent_type: "general-purpose"). Give the subagent: the capability name + purpose, its relevant paths, the spec shape above, and the guardrails below. Its ONLY job: read just that capability\'s code and create or MERGE `openspec/specs/<capability>/spec.md`. It must not explore unrelated areas.',
  "If the Task tool isn't available, do the capabilities yourself one at a time - fully write one spec before starting the next - so you never hold the whole repo at once.",
  "",
  "**Phase 3 - Consolidate.**",
  "Run `openspec validate --strict` (and/or `openspec list --json`), fix any failures, then give a short summary: capabilities created vs updated, and a bullet list of anything uncertain for me to confirm.",
  "",
  "Guardrails:",
  "- One spec per high-level business capability. Do NOT create a spec per file, function, component, or minor utility. Keep the capability count small.",
  "- Merge, don't duplicate: if a spec already exists, add what's missing and fix what drifted; never delete correct content.",
  "- Ground every requirement in real, implemented behavior - no aspirational or future features. Note gaps rather than inventing.",
  "- Write ONLY under `openspec/specs/`. Never touch `openspec/changes/` or implementation code.",
  "- Be idempotent - running again refines, never duplicates.",
  "- If there is no `openspec/` directory yet, tell me to initialise OpenSpec first and stop.",
].join("\n")

// Prompt for the Init button: install OpenSpec, then offer to baseline specs immediately.
const OPENSPEC_INIT_PROMPT = [
  `run "${OPENSPEC_INIT_CMD}"`,
  "",
  "If OpenSpec init fails, report the error and stop.",
  "",
  'If it succeeds, use the `question` tool to ask the user one question - header "Specs", question "OpenSpec is initialised. Derive specifications from the existing project now?", options "Yes" and "No".',
  "",
  'If the user answers "No", stop. If the user answers "Yes", do the following:',
  "",
  SPEC_BASELINE_PROMPT,
].join("\n")

// Renders a progress bar for `done`/`total`; nothing at all when there are no tasks.
function ProgressBar(props: { theme: () => TuiThemeCurrent; done: number; total: number; muted?: string }) {
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

// A single change row in the Active/Completed lists; hover highlight + click to open.
function ChangeRow(props: {
  theme: () => TuiThemeCurrent
  change: OpenSpecChange
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onSelect: (name: string) => void
}) {
  const theme = props.theme
  const change = () => props.change
  const done = () => isComplete(change())
  const hover = () => props.hovered() === change().name
  return (
    <box>
      <box
        width="100%"
        backgroundColor={hover() ? theme().textMuted : undefined}
        onMouseDown={() => props.onSelect(change().name)}
        onMouseOver={() => props.setHovered(() => change().name)}
        onMouseOut={() => props.setHovered((h) => (h === change().name ? null : h))}
      >
        <text>
          <span style={{ fg: done() ? theme().success : theme().warning }}>• </span>
          <span style={{ fg: theme().text }}>{change().name}</span>
        </text>
        <Show when={change().groups.length > 0}>
          <text fg={hover() ? theme().text : theme().textMuted}>{`  ${change().totalTasks} tasks`}</text>
        </Show>
        <ProgressBar
          theme={theme}
          done={change().completedTasks}
          total={change().totalTasks}
          muted={hover() ? theme().text : undefined}
        />
      </box>
    </box>
  )
}

// A small clickable button; fills its background with `color` on hover.
function Button(props: { theme: () => TuiThemeCurrent; label: string; color: string; onClick: () => void }) {
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

// The Apply/Update/Delete button row under a change's progress bar.
function ChangeActions(props: {
  theme: () => TuiThemeCurrent
  name: string
  onCommand: (text: string) => void
  onRequestDelete: () => void
}) {
  const theme = props.theme
  return (
    <box flexDirection="row" gap={1} paddingTop={1} paddingLeft={2}>
      <Button theme={theme} label="Apply" color={theme().success} onClick={() => props.onCommand(`/opsx-apply ${props.name}`)} />
      <Button theme={theme} label="Update" color={theme().warning} onClick={() => props.onCommand(`/opsx-update ${props.name}`)} />
      <Button theme={theme} label="Delete" color={theme().error} onClick={props.onRequestDelete} />
    </box>
  )
}

// Inline confirmation shown in place of the button row before a change is deleted.
function ChangeDeletionConfirm(props: {
  theme: () => TuiThemeCurrent
  onConfirm: () => void
  onCancel: () => void
}) {
  const theme = props.theme
  return (
    <box paddingTop={1} paddingLeft={2}>
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
          Are you sure to delete change with all requirements and tasks?
        </text>
      </box>
      <box flexDirection="row">
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().textMuted }}>
          File changes in repository will not be affected.
        </text>
      </box>
      <box flexDirection="row" gap={1} paddingTop={1}>
        <Button theme={theme} label="Delete" color={theme().error} onClick={props.onConfirm} />
        <Button theme={theme} label="Cancel" color={theme().warning} onClick={props.onCancel} />
      </box>
    </box>
  )
}

// Shown when the project has no openspec/ dir or is missing the opencode tooling.
function NotInitialised(props: { theme: () => TuiThemeCurrent; onInit: () => void }) {
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

// Task groups of a single change; opened from the list so the sidebar stays short.
function ChangeDetail(props: {
  theme: () => TuiThemeCurrent
  change: OpenSpecChange
  onBack: () => void
  onCommand: (text: string) => void
  onDelete: (name: string) => void
}) {
  const theme = props.theme
  const change = () => props.change
  const [backHover, setBackHover] = createSignal(false)
  const [confirming, setConfirming] = createSignal(false)
  return (
    <box>
      <box paddingTop={1}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={isComplete(change()) ? theme().success : theme().warning}>
            <b>{isComplete(change()) ? "Completed Change" : "Active Change"}</b>
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
        <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
      </box>
      <text>
        <span style={{ fg: isComplete(change()) ? theme().success : theme().warning }}>• </span>
        <span style={{ fg: theme().text }}>{change().name}</span>
      </text>
      <text fg={theme().textMuted}>{`  ${change().totalTasks} tasks`}</text>
      <ProgressBar theme={theme} done={change().completedTasks} total={change().totalTasks} />
      <Show
        when={confirming()}
        fallback={
          <ChangeActions
            theme={theme}
            name={change().name}
            onCommand={props.onCommand}
            onRequestDelete={() => setConfirming(true)}
          />
        }
      >
        <ChangeDeletionConfirm
          theme={theme}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            props.onDelete(change().name)
            props.onBack()
          }}
        />
      </Show>
      <box paddingTop={1}>
        <For each={change().groups}>
          {(group, index) => (
            <box paddingTop={index() === 0 ? 0 : 1}>
              <Show when={group.title}>
                <box flexDirection="row" gap={0}>
                  <text flexShrink={0} style={{ fg: isGroupComplete(group) ? theme().textMuted : theme().secondary }}>{"  "}</text>
                  <text
                    flexGrow={1}
                    wrapMode="word"
                    style={{ fg: isGroupComplete(group) ? theme().textMuted : theme().secondary }}
                  >
                    {group.title}
                  </text>
                </box>
              </Show>
              <For each={group.tasks}>
                {(t) => (
                  <box flexDirection="row" gap={0}>
                    <text flexShrink={0} style={{ fg: t.done ? theme().success : theme().textMuted }}>{t.done ? "✓ " : "  "}</text>
                    <text flexGrow={1} wrapMode="word" style={{ fg: t.done ? theme().textMuted : theme().text }}>{t.text}</text>
                  </box>
                )}
              </For>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}

// The thin rule used to separate sections and headers across the sidebar.
function Divider(props: { theme: () => TuiThemeCurrent }) {
  return <text fg={props.theme().borderSubtle}>─────────────────────────────────────</text>
}

// A detail-view header: bold accent label on the left, a clickable "← back" on the right.
function DetailHeader(props: { theme: () => TuiThemeCurrent; label: string; onBack: () => void }) {
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
function Paragraph(props: { theme: () => TuiThemeCurrent; text: string; fg?: string }) {
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

// A single spec row in the Specifications list; hover highlight + click to open.
function SpecRow(props: {
  theme: () => TuiThemeCurrent
  spec: OpenSpecSpec
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onSelect: (name: string) => void
}) {
  const theme = props.theme
  const spec = () => props.spec
  // Namespaced so a spec never shares a hover key with a same-named change row.
  const key = () => `spec:${spec().name}`
  const hover = () => props.hovered() === key()
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
        <text fg={hover() ? theme().text : theme().textMuted}>{`  ${spec().requirements.length} requirements`}</text>
      </box>
    </box>
  )
}

// A clickable requirement row inside a spec's detail view.
function RequirementRow(props: {
  theme: () => TuiThemeCurrent
  req: Requirement
  hovered: () => string | null
  setHovered: (fn: (h: string | null) => string | null) => void
  onSelect: (name: string) => void
}) {
  const theme = props.theme
  const req = () => props.req
  const hover = () => props.hovered() === req().name
  return (
    <box
      width="100%"
      backgroundColor={hover() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(req().name)}
      onMouseOver={() => props.setHovered(() => req().name)}
      onMouseOut={() => props.setHovered((h) => (h === req().name ? null : h))}
    >
      <box flexDirection="row" gap={0}>
        <text flexShrink={0} style={{ fg: theme().accent }}>{"› "}</text>
        <text flexGrow={1} wrapMode="word" style={{ fg: theme().text }}>
          {req().name}
        </text>
      </box>
      <text fg={hover() ? theme().text : theme().textMuted}>{`  ${req().scenarios.length} scenarios`}</text>
    </box>
  )
}

// Spec overview: title + description, optional Purpose, and a clickable requirements list.
function SpecDetail(props: {
  theme: () => TuiThemeCurrent
  spec: OpenSpecSpec
  onOpenReq: (name: string) => void
  onBack: () => void
}) {
  const theme = props.theme
  const spec = () => props.spec
  const [hovered, setHovered] = createSignal<string | null>(null)
  return (
    <box>
      <DetailHeader theme={theme} label="Specification" onBack={props.onBack} />
      <text>
        <span style={{ fg: theme().accent }}>▪ </span>
        <span style={{ fg: theme().text }}>{spec().name}</span>
      </text>
      <box flexDirection="row" paddingTop={1}>
        <text flexGrow={1} wrapMode="word">
          <b>
            <span style={{ fg: theme().text }}>{spec().title}</span>
          </b>
        </text>
      </box>
      <Show when={spec().description}>
        <Paragraph theme={theme} text={spec().description} />
      </Show>
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
            <span style={{ fg: theme().text }}>{spec().requirements.length}</span>
          </b>
        </text>
        <Divider theme={theme} />
        <Show
          when={spec().requirements.length > 0}
          fallback={<text fg={theme().textMuted}>{"  No requirements"}</text>}
        >
          <For each={spec().requirements}>
            {(req) => (
              <RequirementRow
                theme={theme}
                req={req}
                hovered={hovered}
                setHovered={setHovered}
                onSelect={props.onOpenReq}
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

function ScenarioLine(props: { theme: () => TuiThemeCurrent; raw: string }) {
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
function ScenarioFold(props: { theme: () => TuiThemeCurrent; scenario: Scenario; defaultOpen?: boolean }) {
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
function RequirementDetail(props: { theme: () => TuiThemeCurrent; req: Requirement; onBack: () => void }) {
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
        <Show
          when={req().scenarios.length > 0}
          fallback={<text fg={theme().textMuted}>{"  No scenarios"}</text>}
        >
          <For each={req().scenarios}>
            {(sc) => <ScenarioFold theme={theme} scenario={sc} defaultOpen={req().scenarios.length < 4} />}
          </For>
        </Show>
      </box>
    </box>
  )
}

function View(props: { api: TuiPluginApi; onDelete: (name: string) => void }) {
  const theme = () => props.api.theme.current
  const [summary, setSummary] = createSignal<OpenSpecSummary | null>(null, { equals: summaryEquals })
  // null while the first load is in flight, so we don't flash the Init screen on startup.
  const [initialised, setInitialised] = createSignal<boolean | null>(null)
  const [changesOpen, setChangesOpen] = createSignal(false)
  const [completedOpen, setCompletedOpen] = createSignal(false)
  const [specsOpen, setSpecsOpen] = createSignal(false)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [selectedSpec, setSelectedSpec] = createSignal<string | null>(null)
  const [selectedReq, setSelectedReq] = createSignal<string | null>(null)
  const [hovered, setHovered] = createSignal<string | null>(null)

  const directory = () => props.api.state.path.directory
  const sendPrompt = (text: string, submit = false) => {
    const dir = directory()
    void (async () => {
      try {
        await props.api.client.tui.appendPrompt({ text, directory: dir })
        if (submit) await props.api.client.tui.submitPrompt({ directory: dir })
      } catch {
        /* nothing to do if the TUI rejects the prompt */
      }
    })()
  }
  const initOpenSpec = () => sendPrompt(OPENSPEC_INIT_PROMPT, true)

  // Clear the row hover whenever we navigate, otherwise the highlight lingers on
  // return since the unmounted row never fires its onMouseOut. Change and spec
  // selections are kept mutually exclusive so only one detail view is ever active.
  const openChange = (name: string) => {
    setHovered(null)
    setSelectedSpec(null)
    setSelectedReq(null)
    setSelected(name)
  }
  const back = () => {
    setHovered(null)
    setSelected(null)
  }
  const openSpec = (name: string) => {
    setHovered(null)
    setSelected(null)
    setSelectedReq(null)
    setSelectedSpec(name)
  }
  const openRequirement = (name: string) => {
    setHovered(null)
    setSelectedReq(name)
  }
  const backFromSpec = () => {
    setHovered(null)
    setSelectedSpec(null)
    setSelectedReq(null)
  }
  const backFromRequirement = () => {
    setHovered(null)
    setSelectedReq(null)
  }

  const client: FileClient = {
    list: (path) => props.api.client.file.list({ path }).then((r) => r?.data ?? []),
    read: (path) => props.api.client.file.read({ path }).then((r) => r?.data?.content ?? ""),
  }

  let loading = false
  async function load() {
    if (loading) return
    loading = true
    try {
      const s = await readOpenSpec(client)
      setSummary(s)
      setInitialised(s !== null && (await hasOpenSpecTooling(client)))
    } catch {
      setSummary(null)
      setInitialised(false)
    } finally {
      loading = false
    }
  }

  createEffect(() => {
    const dir = props.api.state.path.directory
    if (!dir) return
    void load()
    const id = setInterval(load, 3000)
    onCleanup(() => clearInterval(id)) // createEffect's return value isn't a cleanup; clear here so intervals don't stack
  })

  // Auto-expand the Active Changes and Specifications sections once, when their items
  // first appear; afterwards the user's own collapse/expand is respected.
  let autoOpenedChanges = false
  createEffect(() => {
    if (autoOpenedChanges) return
    if ((summary()?.changes.filter((c) => !isComplete(c)).length ?? 0) > 0) {
      autoOpenedChanges = true
      setChangesOpen(true)
    }
  })
  let autoOpenedSpecs = false
  createEffect(() => {
    if (autoOpenedSpecs) return
    if ((summary()?.specs.length ?? 0) > 0) {
      autoOpenedSpecs = true
      setSpecsOpen(true)
    }
  })

  const totalTasks = createMemo(() => summary()?.changes.reduce((sum, c) => sum + c.totalTasks, 0) ?? 0)
  const completedTasks = createMemo(() => summary()?.changes.reduce((sum, c) => sum + c.completedTasks, 0) ?? 0)
  const activeList = createMemo(() => summary()?.changes.filter((c) => !isComplete(c)) ?? [])
  const completedList = createMemo(() => summary()?.changes.filter((c) => isComplete(c)) ?? [])
  // Resolved from the live summary so the detail view keeps updating while polling.
  const selectedChange = createMemo(() => {
    const name = selected()
    return name ? (summary()?.changes.find((c) => c.name === name) ?? null) : null
  })
  const selectedSpecData = createMemo(() => {
    const name = selectedSpec()
    return name ? (summary()?.specs.find((s) => s.name === name) ?? null) : null
  })
  const selectedRequirement = createMemo(() => {
    const spec = selectedSpecData()
    const name = selectedReq()
    return spec && name ? (spec.requirements.find((r) => r.name === name) ?? null) : null
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>OpenSpec</b>
      </text>
      <text fg={theme().borderSubtle}>─────────────────────────────────────</text>

      <Show when={initialised() === false}>
        <NotInitialised theme={theme} onInit={initOpenSpec} />
      </Show>

      <Show when={initialised() === true && summary()}>
        {(data) => (
          <box>
            <text>
              <b>
                <span style={{ fg: theme().secondary }}>• Tasks Progress:</span>
                <span style={{ fg: theme().text }}> {completedTasks()}/{totalTasks()}</span>
              </b>
            </text>
            <ProgressBar theme={theme} done={completedTasks()} total={totalTasks()} />

            <Show
              when={selectedChange()}
              fallback={
                <Show
                  when={selectedRequirement()}
                  fallback={
                    <Show
                      when={selectedSpecData()}
                      fallback={
                        <box>
                          <box paddingTop={1}>
                            <box flexDirection="row" gap={1} onMouseDown={() => setChangesOpen((x) => !x)}>
                              <text fg={theme().text}>{changesOpen() ? "▼" : "▶"}</text>
                              <text>
                                <b>
                                  <span style={{ fg: theme().warning }}>Active Changes: </span>
                                  <span style={{ fg: theme().text }}>{activeList().length}</span>
                                </b>
                              </text>
                            </box>
                            <Show when={changesOpen()}>
                              <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                              <For each={activeList()}>
                                {(change) => (
                                  <ChangeRow
                                    theme={theme}
                                    change={change}
                                    hovered={hovered}
                                    setHovered={setHovered}
                                    onSelect={openChange}
                                  />
                                )}
                              </For>
                            </Show>
                          </box>

                          <box paddingTop={1}>
                            <box flexDirection="row" gap={1} onMouseDown={() => setCompletedOpen((x) => !x)}>
                              <text fg={theme().text}>{completedOpen() ? "▼" : "▶"}</text>
                              <text>
                                <b>
                                  <span style={{ fg: theme().success }}>Completed Changes: </span>
                                  <span style={{ fg: theme().text }}>{completedList().length}</span>
                                </b>
                              </text>
                            </box>
                            <Show when={completedOpen()}>
                              <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                              <For each={completedList()}>
                                {(change) => (
                                  <ChangeRow
                                    theme={theme}
                                    change={change}
                                    hovered={hovered}
                                    setHovered={setHovered}
                                    onSelect={openChange}
                                  />
                                )}
                              </For>
                            </Show>
                          </box>

                          <box paddingTop={1}>
                            <box flexDirection="row" gap={1} onMouseDown={() => setSpecsOpen((x) => !x)}>
                              <text fg={theme().text}>{specsOpen() ? "▼" : "▶"}</text>
                              <text>
                                <b>
                                  <span style={{ fg: theme().accent }}>Specifications: </span>
                                  <span style={{ fg: theme().text }}>{data().specs.length}</span>
                                </b>
                              </text>
                            </box>
                            <Show when={specsOpen()}>
                              <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                              <For each={data().specs}>
                                {(spec) => (
                                  <SpecRow
                                    theme={theme}
                                    spec={spec}
                                    hovered={hovered}
                                    setHovered={setHovered}
                                    onSelect={openSpec}
                                  />
                                )}
                              </For>
                            </Show>
                          </box>

                          <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                        </box>
                      }
                    >
                      {(spec) => (
                        <SpecDetail
                          theme={theme}
                          spec={spec()}
                          onOpenReq={openRequirement}
                          onBack={backFromSpec}
                        />
                      )}
                    </Show>
                  }
                >
                  {(req) => <RequirementDetail theme={theme} req={req()} onBack={backFromRequirement} />}
                </Show>
              }
            >
              {(change) => (
                <ChangeDetail
                  theme={theme}
                  change={change()}
                  onBack={back}
                  onCommand={(text) => sendPrompt(text)}
                  onDelete={props.onDelete}
                />
              )}
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  async function deleteChange(name: string) {
    const dir = api.state.path.directory
    try {
      if (!dir) throw new Error("no working directory")
      const fs = await import("node:fs/promises")
      // The root is either "openspec" or ".openspec"; force ignores the one that isn't there.
      for (const root of ["openspec", ".openspec"]) {
        await fs.rm(`${dir}/${root}/changes/${name}`, { recursive: true, force: true }).catch(() => {})
      }
    } catch {
      // No filesystem access from the plugin host — hand the deletion to the agent.
      void api.client.tui.appendPrompt({ text: `delete openspec change ${name}`, directory: dir })
    }
    // The sidebar polls every few seconds, so the removed change drops out on its own.
  }

  // Clear first so the `/opsx-baseline` text typed to filter the palette isn't prepended.
  const submitToPrompt = async (text: string) => {
    const dir = api.state.path.directory
    try {
      await api.client.tui.clearPrompt({ directory: dir })
      await api.client.tui.appendPrompt({ text, directory: dir })
      await api.client.tui.submitPrompt({ directory: dir })
    } catch {
      /* ignore if the TUI rejects the prompt */
    }
  }

  // Ephemeral `/opsx-baseline` slash command — reverse-engineers specs from existing code.
  // Auto-disposed on plugin deactivate by opencode's scoped keymap wrapper.
  api.keymap.registerLayer({
    commands: [
      {
        namespace: "palette",
        name: "openspec.baseline",
        title: "OpenSpec: Baseline specs from code",
        desc: "Derive/refresh openspec/specs from the existing implementation",
        category: "OpenSpec",
        slashName: "opsx-baseline",
        run: () => void submitToPrompt(SPEC_BASELINE_PROMPT),
      },
    ],
  })

  api.slots.register({
    order: 600,
    slots: {
      sidebar_content() {
        return <View api={api} onDelete={(name) => void deleteChange(name)} />
      },
    },
  })
}

export default {
  id: "openspec-tui",
  tui,
} satisfies TuiPluginModule
