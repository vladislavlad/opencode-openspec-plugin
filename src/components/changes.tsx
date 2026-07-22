import { createSignal, For, Show } from "solid-js"
import { isComplete, isGroupComplete, type OpenSpecChange } from "../lib/openspec"
import type { Theme } from "../lib/theme"
import { Button, ProgressBar } from "./primitives"

// A single change row in the Active/Completed lists; hover highlight + click to open.
export function ChangeRow(props: {
  theme: Theme
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

// The Apply/Update/Delete button row for an active change. Apply/Update fill the prompt (no submit).
function ChangeActions(props: {
  theme: Theme
  name: string
  onCommand: (text: string, submit?: boolean) => void
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

// The Archive/Update button row for a completed change. Archive runs immediately; Update only fills.
function CompletedChangeActions(props: {
  theme: Theme
  name: string
  onCommand: (text: string, submit?: boolean) => void
}) {
  const theme = props.theme
  return (
    <box flexDirection="row" gap={1} paddingTop={1} paddingLeft={2}>
      <Button theme={theme} label="Archive" color={theme().success} onClick={() => props.onCommand(`/opsx-archive ${props.name}`, true)} />
      <Button theme={theme} label="Update" color={theme().warning} onClick={() => props.onCommand(`/opsx-update ${props.name}`)} />
    </box>
  )
}

// Inline confirmation shown in place of the button row before a change is deleted.
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

// Detail view for one change: header, progress, action row, and the task groups.
export function ChangeDetail(props: {
  theme: Theme
  change: OpenSpecChange
  onBack: () => void
  onCommand: (text: string, submit?: boolean) => void
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
        when={isComplete(change())}
        fallback={
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
        }
      >
        <CompletedChangeActions theme={theme} name={change().name} onCommand={props.onCommand} />
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
