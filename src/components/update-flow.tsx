// The update flow's views. The decision itself lives in `lib/version-history.ts` (`decideMigration`,
// deliberately Solid-free); the sidebar root owns the signals and hands the result down.
import { Show } from "solid-js"
import type { Theme } from "../lib/theme"
import type { Update } from "../lib/updates"
import type { MigrationDecision } from "../lib/version-history"
import { Button, Divider, type Gate } from "./primitives"

// Banner above the action row when an update is available.
export function UpdateBanner(props: {
  theme: Theme
  pluginUpdate: () => Update | null
  cliUpdate: () => Update | null
  onDismiss: () => void
  onSettings: () => void
}) {
  const t = props.theme
  const summary = () => {
    const parts: string[] = []
    if (props.pluginUpdate()) parts.push("plugin")
    if (props.cliUpdate()) parts.push("openspec CLI")
    return parts.join(" and ")
  }
  return (
    <box paddingBottom={1}>
      <text fg={t().textMuted} wrapMode="word">{`Update available for ${summary()}`}</text>
      <box flexDirection="row" gap={2} paddingTop={1}>
        <Button theme={t} label="Settings" color={t().accent} onClick={props.onSettings} />
        <Button theme={t} label="Dismiss" color={t().warning} onClick={props.onDismiss} />
      </box>
      <Divider theme={t} />
    </box>
  )
}

// After an update: either run the migrations, or wait for the build to actually load. `show: "none"`
// renders nothing.
export function PostUpdateBanner(props: {
  theme: Theme
  decision: () => MigrationDecision
  onComplete: () => void
  onReopen: () => void
  gate: Gate
}) {
  const t = props.theme
  const reopenTarget = () => {
    const d = props.decision()
    return d.show === "reopen" ? d.range.new : null
  }
  return (
    <>
      {/* An update turn ran, but the build it installed isn't the one loaded yet. */}
      <Show when={reopenTarget()}>
        {(target) => (
          <box paddingBottom={1}>
            <text fg={t().warning} wrapMode="word">{`Reopen opencode to finish updating to ${target()}`}</text>
            <box flexDirection="row" paddingTop={1}>
              <Button theme={t} label="Reopen OpenCode" color={t().error} {...props.gate} onClick={props.onReopen} />
            </box>
          </box>
        )}
      </Show>

      <Show when={props.decision().show === "migrate"}>
        <box paddingBottom={1}>
          <text fg={t().textMuted} wrapMode="word">Run checks after update</text>
          <box flexDirection="row" paddingTop={1}>
            <Button theme={t} label="Complete Update" color={t().accent} {...props.gate} onClick={props.onComplete} />
          </box>
        </box>
      </Show>
    </>
  )
}
