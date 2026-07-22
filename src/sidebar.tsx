import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { hasOpenSpecTooling, isComplete, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "./lib/openspec"
import { OPENSPEC_INIT_ONLY_PROMPT, OPENSPEC_INIT_PROMPT } from "./lib/prompts"
import { sendPrompt } from "./lib/send-prompt"
import { CollapsibleSection, Divider, NotInitialised, ProgressBar } from "./components/primitives"
import { ChangeDetail, ChangeRow } from "./components/changes"
import { RequirementDetail, SpecDetail, SpecRow } from "./components/specs"

// The sidebar root: polls the openspec dir and renders the list or a drill-in detail view.
export function OpenSpecSidebar(props: { api: TuiPluginApi; onDelete: (name: string) => void; baselineAvailable: boolean }) {
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

  // With the command registered, Init offers to derive specs after install; otherwise it just installs.
  const initOpenSpec = () =>
    void sendPrompt(props.api, props.baselineAvailable ? OPENSPEC_INIT_PROMPT : OPENSPEC_INIT_ONLY_PROMPT, {
      clear: true,
      submit: true,
    })

  // Navigation clears the row hover (the unmounted row never fires onMouseOut) and keeps the
  // change/spec/requirement selections mutually exclusive so only one detail view is ever active.
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

  // Auto-expand the Active Changes / Specifications sections once, when their items first appear;
  // afterwards the user's own collapse/expand is respected.
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
  // Resolved from the live summary so the detail views keep updating while polling.
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
      <Divider theme={theme} />

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
                          <CollapsibleSection
                            theme={theme}
                            open={changesOpen}
                            onToggle={() => setChangesOpen((x) => !x)}
                            label="Active Changes"
                            labelColor={theme().warning}
                            count={activeList().length}
                          >
                            <For each={activeList()}>
                              {(change) => (
                                <ChangeRow theme={theme} change={change} hovered={hovered} setHovered={setHovered} onSelect={openChange} />
                              )}
                            </For>
                          </CollapsibleSection>

                          <CollapsibleSection
                            theme={theme}
                            open={completedOpen}
                            onToggle={() => setCompletedOpen((x) => !x)}
                            label="Completed Changes"
                            labelColor={theme().success}
                            count={completedList().length}
                          >
                            <For each={completedList()}>
                              {(change) => (
                                <ChangeRow theme={theme} change={change} hovered={hovered} setHovered={setHovered} onSelect={openChange} />
                              )}
                            </For>
                          </CollapsibleSection>

                          <CollapsibleSection
                            theme={theme}
                            open={specsOpen}
                            onToggle={() => setSpecsOpen((x) => !x)}
                            label="Specifications"
                            labelColor={theme().accent}
                            count={data().specs.length}
                          >
                            <For each={data().specs}>
                              {(spec) => (
                                <SpecRow theme={theme} spec={spec} hovered={hovered} setHovered={setHovered} onSelect={openSpec} />
                              )}
                            </For>
                          </CollapsibleSection>

                          <Divider theme={theme} />
                        </box>
                      }
                    >
                      {(spec) => <SpecDetail theme={theme} spec={spec()} onOpenReq={openRequirement} onBack={backFromSpec} />}
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
                  onCommand={(text, submit) => void sendPrompt(props.api, text, { submit })}
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
