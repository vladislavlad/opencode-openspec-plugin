import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createEffect, createMemo, For, Show, createSignal, onCleanup } from "solid-js"
import { readOpenSpec, isComplete, isGroupComplete, summaryEquals, type FileClient, type OpenSpecSummary } from "./openspec"

// Renders a progress bar for `done`/`total`; nothing at all when there are no tasks.
function ProgressBar(props: { theme: () => TuiThemeCurrent; done: number; total: number }) {
  const percent = () => Math.round((props.done / props.total) * 100)
  const filled = () => Math.round((props.done / props.total) * 24)
  return (
    <Show when={props.total > 0}>
      <text>
        <span style={{ fg: props.theme().textMuted }}>{`  [`}</span>
        <span style={{ fg: props.theme().success }}>{"█".repeat(filled())}</span>
        <span style={{ fg: props.theme().textMuted }}>{`${"░".repeat(24 - filled())}] ${percent()}%`}</span>
      </text>
    </Show>
  )
}

function View(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [summary, setSummary] = createSignal<OpenSpecSummary | null>(null, { equals: summaryEquals })
  const [changesOpen, setChangesOpen] = createSignal(true)
  const [specsOpen, setSpecsOpen] = createSignal(true)
  // Per-change task expansion, keyed by change name so it survives poll-driven re-renders.
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set())
  const toggleTasks = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const client: FileClient = {
    list: (path) => props.api.client.file.list({ path }).then((r) => r?.data ?? []),
    read: (path) => props.api.client.file.read({ path }).then((r) => r?.data?.content ?? ""),
  }

  let loading = false
  async function load() {
    if (loading) return
    loading = true
    try {
      setSummary(await readOpenSpec(client))
    } catch {
      setSummary(null)
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

  const totalTasks = createMemo(() => summary()?.changes.reduce((sum, c) => sum + c.totalTasks, 0) ?? 0)
  const completedTasks = createMemo(() => summary()?.changes.reduce((sum, c) => sum + c.completedTasks, 0) ?? 0)
  const activeChanges = createMemo(() => (summary()?.changes.filter((c) => c.completedTasks < c.totalTasks).length ?? 0))
  const completedChanges = createMemo(() => (summary()?.changes.filter((c) => isComplete(c)).length ?? 0))

  return (
    <box>
      <Show when={summary()}>
        {(data) => (
          <box>
            <text fg={theme().text}>
              <b>OpenSpec</b>
            </text>
            <text fg={theme().borderSubtle}>─────────────────────────────────────</text>

            <text>
              <span style={{ fg: theme().accent }}>• Specs:</span>
              <span style={{ fg: theme().text }}> {data().specCount}</span>
              <span style={{ fg: theme().accent }}> Requirements:</span>
              <span style={{ fg: theme().text }}> {data().requirementCount}</span>
            </text>
            <text>
              <span style={{ fg: theme().warning }}>• Active Changes:</span>
              <span style={{ fg: theme().text }}> {activeChanges()}</span>
            </text>
            <text>
              <span style={{ fg: theme().success }}>• Completed Changes:</span>
              <span style={{ fg: theme().text }}> {completedChanges()}</span>
            </text>
            <text>
              <span style={{ fg: theme().secondary }}>• Task Progress:</span>
              <span style={{ fg: theme().text }}> {completedTasks()}/{totalTasks()}</span>
            </text>
            <ProgressBar theme={theme} done={completedTasks()} total={totalTasks()} />

            <Show when={data().changes.length > 0}>
              <box paddingTop={1}>
                <box flexDirection="row" gap={1} onMouseDown={() => setChangesOpen((x) => !x)}>
                  <text fg={theme().text}>{changesOpen() ? "▼" : "▶"}</text>
                  <text fg={theme().warning}>
                    <b>Active Changes</b>
                  </text>
                </box>
                <Show when={changesOpen()}>
                  <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                  <For each={data().changes}>
                    {(change) => {
                      const done = isComplete(change)
                      return (
                        <box>
                          <text>
                            <span style={{ fg: done ? theme().success : theme().warning }}>• </span>
                            <span style={{ fg: theme().text }}>{change.name}</span>
                          </text>

                          <Show when={change.groups.length > 0}>
                            <box flexDirection="row" gap={1} onMouseDown={() => toggleTasks(change.name)}>
                              <text fg={theme().textMuted}>{`  ${expanded().has(change.name) ? "▼" : "▶"}`}</text>
                              <text fg={theme().textMuted}>{`${change.totalTasks} tasks`}</text>
                            </box>
                            <Show when={expanded().has(change.name)}>
                              <For each={change.groups}>
                                {(group, index) => (
                                  <box paddingTop={index() === 0 ? 0 : 1}>
                                    <Show when={group.title}>
                                      <text fg={isGroupComplete(group) ? theme().textMuted : theme().secondary}>{`  ${group.title}`}</text>
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
                            </Show>
                          </Show>

                          <ProgressBar theme={theme} done={change.completedTasks} total={change.totalTasks} />
                        </box>
                      )
                    }}
                  </For>
                </Show>
              </box>
            </Show>

            <Show when={data().specs.length > 0}>
              <box paddingTop={1}>
                <box flexDirection="row" gap={1} onMouseDown={() => setSpecsOpen((x) => !x)}>
                  <text fg={theme().text}>{specsOpen() ? "▼" : "▶"}</text>
                  <text fg={theme().accent}>
                    <b>Specifications</b>
                  </text>
                </box>
                <Show when={specsOpen()}>
                  <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
                  <For each={data().specs}>
                    {(spec) => (
                      <box>
                        <text>
                          <span style={{ fg: theme().accent }}>▪ </span>
                          <span style={{ fg: theme().text }}>{spec.name}</span>
                        </text>
                        <text fg={theme().textMuted}>{`  ${spec.requirements} requirements`}</text>
                      </box>
                    )}
                  </For>
                </Show>
              </box>
            </Show>

            <text fg={theme().borderSubtle}>─────────────────────────────────────</text>
          </box>
        )}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 600,
    slots: {
      sidebar_content() {
        return <View api={api} />
      },
    },
  })
}

export default {
  id: "openspec-tui",
  tui,
} satisfies TuiPluginModule
