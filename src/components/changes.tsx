import { createSignal, For, Show } from "solid-js"
import { leadBody, teaser, type ChangeDocs } from "../lib/change-docs"
import { isComplete, isGroupComplete, type OpenSpecChange } from "../lib/openspec"
import type { Theme } from "../lib/theme"
import {
  Button,
  CollapsibleSection,
  DetailHeader,
  Markdown,
  Paragraph,
  ProgressBar,
  rowHover,
  type Gate,
  type HoverState,
} from "./primitives"

// About two rows at a usual sidebar width – enough for the opening sentence of Why.
const TEASER_CHARS = 88

// A change row in the Active/Completed lists; hover highlight + click to open.
export function ChangeRow(props: HoverState & { theme: Theme; change: OpenSpecChange; onSelect: (name: string) => void }) {
  const theme = props.theme
  const change = () => props.change
  const hover = rowHover(props, () => change().name)
  return (
    <box
      width="100%"
      backgroundColor={hover.active() ? theme().textMuted : undefined}
      onMouseDown={() => props.onSelect(change().name)}
      onMouseOver={hover.onMouseOver}
      onMouseOut={hover.onMouseOut}
    >
      <text>
        <span style={{ fg: isComplete(change()) ? theme().success : theme().warning }}>• </span>
        <span style={{ fg: theme().text }}>{change().name}</span>
      </text>
      <box paddingLeft={2}>
        <ProgressBar
          theme={theme}
          done={change().completedTasks}
          total={change().totalTasks}
          muted={hover.active() ? theme().text : undefined}
          showNumberOfTasks
        />
      </box>
    </box>
  )
}

// Apply/Update only fill the prompt so the user can add context before sending.
function ChangeActions(props: { theme: Theme; name: string; onCommand: (text: string, submit?: boolean) => void; onRequestDelete: () => void; gate: Gate }) {
  const theme = props.theme
  return (
    <box flexDirection="row" gap={1} paddingTop={1} paddingLeft={2}>
      <Button theme={theme} label="Apply" color={theme().success} {...props.gate} onClick={() => props.onCommand(`/opsx-apply ${props.name}`)} />
      <Button theme={theme} label="Update" color={theme().warning} {...props.gate} onClick={() => props.onCommand(`/opsx-update ${props.name}`)} />
      <Button theme={theme} label="Delete" color={theme().error} {...props.gate} onClick={props.onRequestDelete} />
    </box>
  )
}

// Archive runs immediately; Update only fills.
function CompletedChangeActions(props: { theme: Theme; name: string; onCommand: (text: string, submit?: boolean) => void; gate: Gate }) {
  const theme = props.theme
  return (
    <box flexDirection="row" gap={1} paddingTop={1} paddingLeft={2}>
      <Button theme={theme} label="Archive" color={theme().success} {...props.gate} onClick={() => props.onCommand(`/opsx-archive ${props.name}`, true)} />
      <Button theme={theme} label="Update" color={theme().warning} {...props.gate} onClick={() => props.onCommand(`/opsx-update ${props.name}`)} />
    </box>
  )
}

// Shown in place of the button row before a change is deleted.
function ChangeDeletionConfirm(props: { theme: Theme; onConfirm: () => void; onCancel: () => void }) {
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

// The task groups – the body of the Tasks section. A group title hangs at column zero and its tasks
// sit in the marker column, so the two levels read apart without any extra glyph.
function TaskGroups(props: { theme: Theme; change: OpenSpecChange }) {
  const theme = props.theme
  return (
    <For each={props.change.groups}>
      {(group, index) => (
        <box paddingTop={index() === 0 ? 0 : 1}>
          <Show when={group.title}>
            <box flexDirection="row">
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
  )
}

// The Proposal body: every section of proposal.md under its own label, in file order. `Capabilities`
// is dropped upstream – it's the delta list, and that gets a section of its own.
function ProposalBody(props: { theme: Theme; docs: ChangeDocs }) {
  const theme = props.theme
  const docs = () => props.docs
  return (
    <Show
      when={docs().hasProposal}
      fallback={<text fg={theme().textMuted}>{"  No proposal.md"}</text>}
    >
      <For each={docs().parts}>
        {(part, index) => (
          <box paddingTop={index() === 0 ? 0 : 1}>
            <box flexDirection="row">
              <text flexGrow={1} wrapMode="word" style={{ fg: theme().accent }}>
                <b>{part.label}</b>
              </text>
            </box>
            <Markdown theme={theme} text={part.body} />
          </box>
        )}
      </For>
    </Show>
  )
}

// Detail view for one change: header, progress, action row, and the Proposal/Design/Tasks sections.
// `docs` is null while the artifacts are still being read – the sections render empty rather than
// claiming the files are missing.
export function ChangeDetail(props: {
  theme: Theme
  change: OpenSpecChange
  docs: ChangeDocs | null
  onBack: () => void
  onCommand: (text: string, submit?: boolean) => void
  onDelete: (name: string) => void
  gate: Gate
}) {
  const theme = props.theme
  const change = () => props.change
  const done = () => isComplete(change())
  const accent = () => (done() ? theme().success : theme().warning)
  const [confirming, setConfirming] = createSignal(false)
  const [proposalOpen, setProposalOpen] = createSignal(false)
  const [designOpen, setDesignOpen] = createSignal(false)
  const [tasksOpen, setTasksOpen] = createSignal(true)
  const summary = () => teaser(leadBody(props.docs?.parts ?? []), TEASER_CHARS)
  return (
    <box>
      <DetailHeader
        theme={theme}
        label={done() ? "Completed Change" : "Active Change"}
        color={accent()}
        onBack={props.onBack}
      />
      <text>
        <span style={{ fg: accent() }}>• </span>
        <span style={{ fg: theme().text }}>{change().name}</span>
      </text>
      <box paddingLeft={2}>
        <ProgressBar theme={theme} done={change().completedTasks} total={change().totalTasks} showNumberOfTasks />
      </box>
      <Show
        when={done()}
        fallback={
          <Show
            when={confirming()}
            fallback={
              <ChangeActions
                theme={theme}
                name={change().name}
                onCommand={props.onCommand}
                onRequestDelete={() => setConfirming(true)}
                gate={props.gate}
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
        }
      >
        <CompletedChangeActions theme={theme} name={change().name} onCommand={props.onCommand} gate={props.gate} />
      </Show>

      <CollapsibleSection
        theme={theme}
        open={proposalOpen}
        onToggle={() => setProposalOpen((x) => !x)}
        label="Proposal"
        labelColor={theme().accent}
        collapsedSummary={
          <Show when={summary()}>
            {/* Indented like the collapsed summaries of the list sections. */}
            <box paddingLeft={2}>
              <Paragraph theme={theme} text={summary()} fg={theme().textMuted} />
            </box>
          </Show>
        }
      >
        <Show when={props.docs}>{(docs) => <ProposalBody theme={theme} docs={docs()} />}</Show>
      </CollapsibleSection>

      {/* design.md is optional, so its absence hides the section instead of reporting it. */}
      <Show when={props.docs?.design}>
        {(design) => (
          <CollapsibleSection
            theme={theme}
            open={designOpen}
            onToggle={() => setDesignOpen((x) => !x)}
            label="Design"
            labelColor={theme().secondary}
          >
            <Markdown theme={theme} text={design()} />
          </CollapsibleSection>
        )}
      </Show>

      <CollapsibleSection
        theme={theme}
        open={tasksOpen}
        onToggle={() => setTasksOpen((x) => !x)}
        label="Tasks"
        labelColor={accent()}
      >
        <TaskGroups theme={theme} change={change()} />
      </CollapsibleSection>
    </box>
  )
}
