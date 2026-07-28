import { Show } from "solid-js"
import type { Theme } from "../lib/theme"
import type { Update } from "../lib/updates"
import type { UpdateTargets } from "../lib/update-prompt"
import { VERSION } from "../lib/version"
import { Button, Divider, type Gate } from "./primitives"

// Label left, installed version right, and – when an update exists – an "available" line + button.
function VersionRow(props: {
  theme: Theme
  label: string
  current: string
  update: () => Update | null
  onUpdate: () => void
  gate: Gate
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
            <Button theme={t} label="Update" color={t().success} {...props.gate} onClick={props.onUpdate} />
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
  gate: Gate
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
        <Button theme={t} label="Check Versions" color={t().secondary} {...props.gate} onClick={props.onCheck} />
        <Show when={anyUpdate()}>
          <Button theme={t} label="Update All" color={t().success} {...props.gate} onClick={updateAll} />
        </Show>
      </box>
      <Divider theme={t} />

      <Show when={props.reloadPending()}>
        <box paddingTop={1}>
          <text fg={t().textMuted} wrapMode="word">
            Reload opencode to update plugin
          </text>
          <box flexDirection="row" paddingTop={1}>
            <Button theme={t} label="Reload OpenCode" color={t().error} {...props.gate} onClick={props.onReload} />
          </box>
        </box>
      </Show>
    </box>
  )
}
