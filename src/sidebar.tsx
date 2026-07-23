import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { hasOpenSpecTooling, isComplete, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "./lib/openspec"
import { OPENSPEC_INIT_ONLY_PROMPT, OPENSPEC_INIT_PROMPT } from "./lib/prompts"
import { quitOpencode, runCommand, sendPrompt } from "./lib/send-prompt"
import { registerOpsxFsCommands } from "./features/commands"
import { Button, CollapsibleSection, Divider, NotInitialised, ProgressBar } from "./components/primitives"
import { ChangeDetail, ChangeRow } from "./components/changes"
import { RequirementDetail, SpecDetail, SpecRow } from "./components/specs"

// The sidebar root: polls the openspec dir and renders the list or a drill-in detail view.
export function OpenSpecSidebar(props: { api: TuiPluginApi; sessionId: string; onDelete: (name: string) => void; baselineAvailable: boolean }) {
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
  // false once we know the init /opsx-* commands aren't loaded (written this session but pre-restart).
  const [commandsReady, setCommandsReady] = createSignal<boolean | null>(null)
  // Init pressed; hold "Initializing…" until the agent goes idle.
  const [setupInProgress, setSetupInProgress] = createSignal(false)
  const [ephemeralResult, setEphemeralResult] = createSignal<"idle" | "loaded" | "failed">("idle")
  const [dot, setDot] = createSignal(0) // 0..2 — which of the "Initializing" dots is lit
  let pendingEphemeral = false // register the /opsx-* files once the init turn ends

  // After the init turn the /opsx-* files are on disk; register them ephemerally. Warn on success,
  // reload prompt on failure.
  const installEphemeral = async () => {
    if (commandsReady() === true) return // already loaded natively
    const n = await registerOpsxFsCommands(props.api, client.read)
    setEphemeralResult(n > 0 ? "loaded" : "failed")
  }

  const initOpenSpec = () => {
    setSetupInProgress(true)
    setEphemeralResult("idle")
    pendingEphemeral = true
    void sendPrompt(props.api, props.baselineAvailable ? OPENSPEC_INIT_PROMPT : OPENSPEC_INIT_ONLY_PROMPT, {
      clear: true,
      submit: true,
    })
  }

  // Clear row hover (unmounted rows never fire onMouseOut) and keep selections mutually exclusive.
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
      // Are the init commands actually loaded? Stay optimistic on a fetch error.
      const cmds = await props.api.client.command
        .list()
        .then((r) => r?.data ?? null)
        .catch(() => null)
      if (cmds) setCommandsReady(cmds.some((c) => c.name === "opsx-propose"))
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

  // Move the lit "Initializing" dot while setup runs.
  createEffect(() => {
    if (!setupInProgress()) return setDot(0)
    const id = setInterval(() => setDot((d) => (d + 1) % 3), 500)
    onCleanup(() => clearInterval(id))
  })

  // Init turn ends on busy→idle: clear "Initializing…" and register the fresh /opsx-* commands.
  // sawBusy guards against firing before the turn has actually started.
  let sawBusy = false
  createEffect(() => {
    if (busy()) sawBusy = true
    else if (sawBusy) {
      sawBusy = false
      setSetupInProgress(false)
      if (pendingEphemeral) {
        pendingEphemeral = false
        void installEphemeral()
      }
    }
  })

  // Auto-expand Active Changes / Specifications once their items first appear; then respect the user.
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

  const activeList = createMemo(() => summary()?.changes.filter((c) => !isComplete(c)) ?? [])
  const completedList = createMemo(() => summary()?.changes.filter((c) => isComplete(c)) ?? [])
  // Agent mid-turn — used to disable actions and hide the reload prompt.
  const busy = createMemo(() => {
    const st = props.api.state.session.status(props.sessionId)
    return st?.type === "busy" || st?.type === "retry"
  })
  const toastBusy = () => props.api.ui.toast({ variant: "info", message: "Wait until the agent finishes working" })
  const disabledProps = { disabled: busy, onDisabledClick: toastBusy }

  // Above the action row: none while busy/native, warn if bridged ephemerally, error if that failed.
  const banner = createMemo<"none" | "warn" | "error">(() => {
    if (busy() || commandsReady() === true) return "none"
    if (ephemeralResult() === "loaded") return "warn"
    if (ephemeralResult() === "failed") return "error"
    return "none"
  })
  // Task progress across active changes (shown under the collapsed header).
  const activeTotal = createMemo(() => activeList().reduce((sum, c) => sum + c.totalTasks, 0))
  const activeDone = createMemo(() => activeList().reduce((sum, c) => sum + c.completedTasks, 0))
  // Resolved from the live summary so detail views keep updating while polling.
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

      {/* Hold "Initializing" (with a running dot) over everything for the whole init turn. */}
      <Show when={setupInProgress()}>
        <text fg={theme().textMuted}>
          Initializing
          <span style={{ fg: dot() === 0 ? theme().text : theme().textMuted }}>.</span>
          <span style={{ fg: dot() === 1 ? theme().text : theme().textMuted }}>.</span>
          <span style={{ fg: dot() === 2 ? theme().text : theme().textMuted }}>.</span>
        </text>
      </Show>

      <Show when={!setupInProgress() && initialised() === false}>
        <NotInitialised theme={theme} onInit={initOpenSpec} {...disabledProps} />
      </Show>

      <Show when={!setupInProgress() && initialised() === true && summary()}>
        {(data) => (
          <box>
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
                          {/* banner: warn = ephemeral bridge active (reopen for full flow), error = it failed. */}
                          <Show
                            when={banner() === "error"}
                            fallback={
                              <box>
                                <Show when={banner() === "warn"}>
                                  <box paddingBottom={1}>
                                    <text fg={theme().warning} wrapMode="word">
                                      Reopen opencode for full OpenSpec support — commands are loaded temporarily
                                    </text>
                                  </box>
                                </Show>
                                <box flexDirection="row" gap={2}>
                                  <Button theme={theme} label="Explore" color={theme().accent} {...disabledProps} onClick={() => void sendPrompt(props.api, "/opsx-explore ")} />
                                  <Button theme={theme} label="Propose" color={theme().secondary} {...disabledProps} onClick={() => void sendPrompt(props.api, "/opsx-propose ")} />
                                  <Show when={completedList().length > 0}>
                                    {/* One completed change → archive it directly; several → let the command prompt. */}
                                    <Button
                                      theme={theme}
                                      label="Archive"
                                      color={theme().success}
                                      {...disabledProps}
                                      onClick={() =>
                                        void runCommand(
                                          props.api,
                                          completedList().length === 1 ? `/opsx-archive ${completedList()[0].name}` : "/opsx-archive",
                                        )
                                      }
                                    />
                                  </Show>
                                </box>
                              </box>
                            }
                          >
                            <box paddingBottom={1}>
                              <text fg={theme().error} wrapMode="word">
                                OpenSpec commands didn't load — reopen opencode to finish setup
                              </text>
                            </box>
                            <box flexDirection="row">
                              <Button theme={theme} label="Reload" color={theme().error} {...disabledProps} onClick={() => quitOpencode(props.api)} />
                            </box>
                          </Show>
                          <CollapsibleSection
                            theme={theme}
                            open={changesOpen}
                            onToggle={() => setChangesOpen((x) => !x)}
                            label="Active Changes"
                            labelColor={theme().warning}
                            count={activeList().length}
                            collapsedSummary={
                              <Show when={activeList().length > 0}>
                                <text fg={theme().textMuted}>{`  ${activeDone()}/${activeTotal()} tasks done`}</text>
                                <ProgressBar theme={theme} done={activeDone()} total={activeTotal()} />
                              </Show>
                            }
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
                  // Apply/Update fill the prompt; Archive (submit) runs the command.
                  onCommand={(text, submit) => {
                    if (submit) void runCommand(props.api, text)
                    else void sendPrompt(props.api, text)
                  }}
                  onDelete={props.onDelete}
                  gate={disabledProps}
                />
              )}
            </Show>
          </box>
        )}
      </Show>
    </box>
  )
}
