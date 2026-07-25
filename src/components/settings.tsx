import { Show } from "solid-js"
import type { Theme } from "../lib/theme"
import type { Update } from "../lib/updates"
import type { UpdateTargets } from "../lib/prompts"
import { VERSION } from "../lib/version"
import { Button, Divider } from "./primitives"

// One version row: label on the left, current value on the right, and — when an update exists —
// an "x.y.z version available" line plus an Update button underneath.
function VersionRow(props: {
  theme: Theme
  label: string
  current: string
  update: () => Update | null
  onUpdate: () => void
  gate: { disabled: () => boolean; onDisabledClick: () => void }
}) {
  const t = props.theme
  return (
    <box paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={t().textMuted}>{props.label}</text>
        <text fg={t().text} paddingRight={1}>{props.current}</text>
      </box>
      <Show when={props.update()}>
        {(u) => (
          <box flexDirection="row" justifyContent="space-between">
            <text fg={t().warning}>{`${u().next} version available`}</text>
            <Button theme={t} label="Update" color={t().success} disabled={props.gate.disabled} onDisabledClick={props.gate.onDisabledClick} onClick={props.onUpdate} />
          </box>
        )}
      </Show>
    </box>
  )
}

export function SettingsView(props: {
  theme: Theme
  cliCurrent: () => string | null
  pluginUpdate: () => Update | null
  cliUpdate: () => Update | null
  onCheck: () => void
  onUpdate: (t: UpdateTargets) => void
  reloadPending: () => boolean
  onReload: () => void
  gate: { disabled: () => boolean; onDisabledClick: () => void }
}) {
  const t = props.theme
  const anyUpdate = () => props.pluginUpdate() != null || props.cliUpdate() != null
  const updateAll = () => {
    const p = props.pluginUpdate()
    const c = props.cliUpdate()
    props.onUpdate({
      plugin: p ? { current: p.current, next: p.next } : undefined,
      cli: c ? { next: c.next } : undefined,
    })
  }

  return (
    <box>
      <VersionRow
        theme={t}
        label="Plugin version"
        current={VERSION}
        update={props.pluginUpdate}
        onUpdate={() => {
          const p = props.pluginUpdate()
          if (p) props.onUpdate({ plugin: { current: p.current, next: p.next } })
        }}
        gate={props.gate}
      />
      <VersionRow
        theme={t}
        label="OpenSpec CLI"
        current={props.cliCurrent() ?? "unknown"}
        update={props.cliUpdate}
        onUpdate={() => {
          const c = props.cliUpdate()
          if (c) props.onUpdate({ cli: { next: c.next } })
        }}
        gate={props.gate}
      />

      <box flexDirection="row" gap={2} justifyContent="flex-end" paddingTop={1}>
        <Button theme={t} label="Check Versions" color={t().secondary} onClick={props.onCheck} />
        <Show when={anyUpdate()}>
          <Button theme={t} label="Update All" color={t().success} disabled={props.gate.disabled} onDisabledClick={props.gate.onDisabledClick} onClick={updateAll} />
        </Show>
      </box>
      <Divider theme={t} />

      <Show when={props.reloadPending()}>
        <box paddingTop={1}>
          <text fg={t().textMuted} wrapMode="word">
            Reload opencode to update plugin
          </text>
          <box flexDirection="row" paddingTop={1}>
            <Button theme={t} label="Reload" color={t().error} onClick={props.onReload} />
          </box>
        </box>
      </Show>
    </box>
  )
}
