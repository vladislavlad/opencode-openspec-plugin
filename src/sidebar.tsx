import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { Theme } from "./lib/theme"
import { hasOpenSpecTooling, isComplete, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "./lib/openspec"
import {
  INIT_DISMISS_PROMPT,
  NO_STAGES_DONE,
  OPENSPEC_INIT_ONLY_PROMPT,
  buildInitPrompt,
  buildUpdatePrompt,
  type InitDone,
  type InitStage,
  type UpdateTargets,
} from "./lib/prompts"
import { INIT_STAGES } from "./lib/prompts"
import { checkVersions, readInitFlag, readUpdateFlag, type InitState, type Update, type UpdateFlag } from "./lib/updates"
import { buildMigrationPrompt } from "./lib/migrations"
import { quitOpencode, runCommand, sendPrompt } from "./lib/send-prompt"
import { registerOpsxFsCommands } from "./features/commands"
import { BackButton, Button, CollapsibleSection, Divider, NotInitialised, ProgressBar } from "./components/primitives"
import { ChangeDetail, ChangeRow } from "./components/changes"
import { RequirementDetail, SpecDetail, SpecRow } from "./components/specs"
import { SearchField } from "./components/search"
import { SettingsView } from "./components/settings"
import { searchSpecs } from "./lib/search"
import { VERSION } from "./lib/version"

// Banner above the action row when an update is available: a muted line + Dismiss / Settings.
function UpdateBanner(props: {
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

// Shown when config.yaml still carries the init flag but no turn is running — setup was interrupted.
function InitBanner(props: { theme: Theme; stoppedAt: () => string; onResume: () => void; onDismiss: () => void; gate: { disabled?: () => boolean; onDisabledClick?: () => void } }) {
  const t = props.theme
  return (
    <box paddingBottom={1}>
      <text fg={t().warning} wrapMode="word">{`Initialization stopped ${props.stoppedAt()}`}</text>
      <box flexDirection="row" gap={2} paddingTop={1}>
        <Button theme={t} label="Resume" color={t().secondary} {...props.gate} onClick={props.onResume} />
        <Button theme={t} label="Dismiss" color={t().warning} onClick={props.onDismiss} />
      </box>
      <Divider theme={t} />
    </box>
  )
}

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
  const [specQuery, setSpecQuery] = createSignal("")
  // false once we know the init /opsx-* commands aren't loaded (written this session but pre-restart).
  const [commandsReady, setCommandsReady] = createSignal<boolean | null>(null)
  // Init pressed; hold "Initializing…" until the agent goes idle.
  const [setupInProgress, setSetupInProgress] = createSignal(false)
  const [ephemeralResult, setEphemeralResult] = createSignal<"idle" | "loaded" | "failed">("idle")
  const [showSettings, setShowSettings] = createSignal(false)
  const [headerHover, setHeaderHover] = createSignal(false)
  const [dot, setDot] = createSignal(0) // 0..2 — which of the "Initializing" dots is lit
  // Version tracking: current CLI version + pending updates, the post-update flag, and banner state.
  const [pluginUpdate, setPluginUpdate] = createSignal<Update | null>(null)
  const [cliUpdate, setCliUpdate] = createSignal<Update | null>(null)
  const [cliCurrent, setCliCurrent] = createSignal<string | null>(null)
  const [updateFlag, setUpdateFlag] = createSignal<UpdateFlag | null>(null)
  const [bannerDismissed, setBannerDismissed] = createSignal(false)
  const [reloadPending, setReloadPending] = createSignal(false)
  // Setup marker read from config.yaml: drives the status line, the interrupted banner and Resume.
  const [initState, setInitState] = createSignal<InitState>({ inProgress: false, done: [] })
  // Init turn ended without producing tooling.
  const [setupFailed, setSetupFailed] = createSignal(false)
  let pendingEphemeral = false // register the /opsx-* files once the init turn ends
  let pendingReload = false // show the reload prompt once an update turn ends

  // After the init turn the /opsx-* files are on disk; register them ephemerally. Warn on success,
  // reload prompt on failure.
  const installEphemeral = async () => {
    if (commandsReady() === true) return // already loaded natively
    const n = await registerOpsxFsCommands(props.api, client.read)
    setEphemeralResult(n > 0 ? "loaded" : "failed")
  }

  const startInit = (done: InitDone) => {
    setSetupInProgress(true)
    setEphemeralResult("idle")
    setSetupFailed(false)
    pendingEphemeral = true
    void sendPrompt(props.api, props.baselineAvailable ? buildInitPrompt(done) : OPENSPEC_INIT_ONLY_PROMPT, {
      clear: true,
      submit: true,
    })
  }
  const stageDone = (stage: InitStage) => initState().done.includes(stage)
  // Init always starts over, even when openspec/ and .opencode/ are already there.
  const initOpenSpec = () => startInit(NO_STAGES_DONE)
  const resumeInit = () => startInit({ tooling: stageDone("tooling"), config: stageDone("config"), specs: stageDone("specs") })
  // Dismiss hands the agent a turn to drop the marker — the banner goes once it's gone from config.yaml.
  const dismissInit = () => {
    if (busy()) return void toastBusy()
    void sendPrompt(props.api, INIT_DISMISS_PROMPT, { clear: true, submit: true })
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

  // Hit the npm registry once (per directory / manual Check Versions) — not on every poll. A fresh
  // check re-shows a previously dismissed banner.
  // `notify` toasts the outcome — used by the manual Check Versions button, not the silent auto-check.
  // Available updates aren't toasted: they surface in the banner / Settings rows instead.
  const runVersionCheck = async (notify = false) => {
    const s = await checkVersions(client)
    setCliCurrent(s.cliCurrent)
    setPluginUpdate(s.plugin)
    setCliUpdate(s.cli)
    setBannerDismissed(false)
    if (!notify) return
    if (!s.reachable) props.api.ui.toast({ variant: "warning", message: "Couldn't reach npm registry" })
    else if (!s.plugin && !s.cli) props.api.ui.toast({ variant: "success", message: "All versions are up to date" })
  }
  const updateAvailable = createMemo(() => pluginUpdate() != null || cliUpdate() != null)

  // Update / Update All / Complete Update: build the prompt and hand a real turn to the agent (same
  // pattern as Init). All are blocked while the agent is busy.
  const sendUpdate = (targets: UpdateTargets) => {
    if (busy()) return void toastBusy()
    pendingReload = true
    void sendPrompt(props.api, buildUpdatePrompt(targets), { clear: true, submit: true })
  }
  const completeUpdate = () => {
    const f = updateFlag()
    if (!f) return
    if (busy()) return void toastBusy()
    void sendPrompt(props.api, buildMigrationPrompt(f), { clear: true, submit: true })
  }

  let loading = false
  async function load() {
    if (loading) return
    loading = true
    try {
      const s = await readOpenSpec(client)
      setSummary(s)
      setInitialised(s !== null && (await hasOpenSpecTooling(client)))
      // Cheap file reads every poll so the banners clear once the agent removes their flags.
      setUpdateFlag(await readUpdateFlag(client))
      setInitState(await readInitFlag(client))
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
    void runVersionCheck() // once per directory, off the render path
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
        // Re-read before judging: the poll can be up to 3s stale right after the turn.
        void load().then(() => setSetupFailed(initialised() !== true))
      }
      if (pendingReload) {
        pendingReload = false
        setReloadPending(true)
      }
    }
  })

  // Auto-expand each section once its items first appear; after that, respect the user's toggling.
  let autoOpenedChanges = false
  createEffect(() => {
    if (autoOpenedChanges) return
    if ((summary()?.changes.filter((c) => !isComplete(c)).length ?? 0) > 0) {
      autoOpenedChanges = true
      setChangesOpen(true)
    }
  })
  let autoOpenedCompleted = false
  createEffect(() => {
    if (autoOpenedCompleted) return
    if ((summary()?.changes.filter(isComplete).length ?? 0) > 0) {
      autoOpenedCompleted = true
      setCompletedOpen(true)
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

  // Specifications filtered by the search field; an empty query passes everything through.
  const specMatches = createMemo(() => searchSpecs(summary()?.specs ?? [], specQuery()))
  const activeList = createMemo(() => summary()?.changes.filter((c) => !isComplete(c)) ?? [])
  const completedList = createMemo(() => summary()?.changes.filter((c) => isComplete(c)) ?? [])
  // Agent mid-turn — used to disable actions and hide the reload prompt.
  const busy = createMemo(() => {
    const st = props.api.state.session.status(props.sessionId)
    return st?.type === "busy" || st?.type === "retry"
  })
  const toastBusy = () => props.api.ui.toast({ variant: "info", message: "Wait until the agent finishes working" })
  const disabledProps = { disabled: busy, onDisabledClick: toastBusy }

  // The first stage the agent hasn't checkpointed; "validate" once all three are recorded.
  const setupStage = createMemo<InitStage | "validate">(
    () => INIT_STAGES.find((s) => !stageDone(s)) ?? "validate",
  )
  const setupPhase = () =>
    ({
      tooling: "Installing OpenSpec",
      config: "Configuring project",
      specs: "Deriving specs",
      validate: "Validating specs",
    })[setupStage()]
  const stoppedAt = () =>
    ({
      tooling: "while installing OpenSpec",
      config: "while configuring the project",
      specs: "while deriving specs",
      validate: "while validating specs",
    })[setupStage()]
  // Interrupted mid-setup. Before the tooling checkpoint we offer Init instead, so the banner waits.
  const initIncomplete = createMemo(
    () => initState().inProgress && stageDone("tooling") && !busy() && !setupInProgress(),
  )
  // Setup owns the screen until it finishes: Init starts over while tooling isn't checkpointed…
  const needsInit = createMemo(
    () => initialised() === false || (initialised() === true && initState().inProgress && !stageDone("tooling")),
  )

  // Above the action row: none while busy/native, warn if bridged ephemerally, error if that failed.
  // Held back until setup is finished or dismissed — Reload and Resume are mutually exclusive.
  const banner = createMemo<"none" | "warn" | "error">(() => {
    if (busy() || commandsReady() === true || initState().inProgress) return "none"
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
      <box
        flexDirection="row"
        justifyContent="space-between"
        onMouseOver={() => setHeaderHover(true)}
        onMouseOut={() => setHeaderHover(false)}
      >
        <text fg={theme().text}>
          <b>OpenSpec</b>
          <Show when={headerHover()}>
            {" "}<span style={{ fg: theme().textMuted }}>{VERSION}</span>
          </Show>
        </text>
        <Show when={!showSettings()} fallback={<BackButton theme={theme} onBack={() => setShowSettings(false)} />}>
          <Button
            theme={theme}
            label="Settings"
            color={updateAvailable() || headerHover() ? theme().accent : theme().textMuted}
            onClick={() => setShowSettings(true)}
          />
        </Show>
      </box>
      <Divider theme={theme} />

      {/* Status line over the content (not instead of it) so specs fill in live during setup. */}
      <Show when={setupInProgress() && !showSettings()}>
        <box paddingBottom={1}>
          <text fg={theme().textMuted}>
            {setupPhase()}
            <span style={{ fg: dot() === 0 ? theme().text : theme().textMuted }}>.</span>
            <span style={{ fg: dot() === 1 ? theme().text : theme().textMuted }}>.</span>
            <span style={{ fg: dot() === 2 ? theme().text : theme().textMuted }}>.</span>
          </text>
        </box>
      </Show>

      <Show when={!showSettings() && initIncomplete()}>
        <InitBanner
          theme={theme}
          stoppedAt={stoppedAt}
          gate={disabledProps}
          onResume={resumeInit}
          onDismiss={dismissInit}
        />
      </Show>

      <Show when={showSettings()}>
        <SettingsView
          theme={theme}
          cliCurrent={cliCurrent}
          pluginUpdate={pluginUpdate}
          cliUpdate={cliUpdate}
          onCheck={() => void runVersionCheck(true)}
          onUpdate={sendUpdate}
          reloadPending={reloadPending}
          onReload={() => quitOpencode(props.api)}
          gate={disabledProps}
        />
      </Show>

      <Show when={!setupInProgress() && !showSettings() && needsInit()}>
        <Show when={setupFailed() || initState().inProgress}>
          <box paddingBottom={1}>
            <text fg={theme().warning} wrapMode="word">Setup aborted – press "Init" to continue</text>
          </box>
        </Show>
        <NotInitialised theme={theme} onInit={initOpenSpec} {...disabledProps} />
      </Show>

      <Show when={!showSettings() && !needsInit() && initialised() === true && summary()}>
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
                        {/* Update available → banner over the actions; Settings button already turns accent. */}
                        <Show when={updateAvailable() && !bannerDismissed()}>
                          <UpdateBanner
                            theme={theme}
                            pluginUpdate={pluginUpdate}
                            cliUpdate={cliUpdate}
                            onDismiss={() => setBannerDismissed(true)}
                            onSettings={() => {
                              setBannerDismissed(true)
                              setShowSettings(true)
                            }}
                          />
                        </Show>
                        {/* Post-update: flag left by the update turn. Migrate only if the new build actually loaded. */}
                        <Show when={updateFlag()}>
                          {(f) => (
                            <box paddingBottom={1}>
                              <Show
                                when={f().new === VERSION}
                                fallback={
                                  <text fg={theme().warning} wrapMode="word">
                                    {`Reopen opencode to finish updating to ${f().new}`}
                                  </text>
                                }
                              >
                                <text fg={theme().textMuted} wrapMode="word">
                                  Run checks after update
                                </text>
                                <box flexDirection="row" paddingTop={1}>
                                  <Button theme={theme} label="Complete Update" color={theme().accent} {...disabledProps} onClick={completeUpdate} />
                                </box>
                              </Show>
                            </box>
                          )}
                        </Show>
                        {/* Same prompt whether the ephemeral bridge took or not — only a restart loads them properly. */}
                        <Show when={banner() !== "none"}>
                          <box paddingBottom={1}>
                            <text fg={theme().warning} wrapMode="word">
                              Reload opencode to activate new commands and skills
                            </text>
                            <box flexDirection="row" paddingTop={1}>
                              <Button theme={theme} label="Reload OpenCode" color={theme().error} {...disabledProps} onClick={() => quitOpencode(props.api)} />
                            </box>
                          </box>
                        </Show>
                        {/* Hidden when the bridge failed: the /opsx-* commands these fill in wouldn't resolve. */}
                        <Show when={banner() !== "error"}>
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
                          count={specMatches().length}
                        >
                          <SearchField
                            theme={theme}
                            renderer={props.api.renderer}
                            value={specQuery}
                            onInput={setSpecQuery}
                            placeholder="Search specs"
                          />
                          <Show
                            when={specMatches().length > 0}
                            fallback={<text fg={theme().textMuted}>{"  No matches"}</text>}
                          >
                            <For each={specMatches()}>
                              {(match) => (
                                <SpecRow
                                  theme={theme}
                                  spec={match.spec}
                                  hovered={hovered}
                                  setHovered={setHovered}
                                  onSelect={openSpec}
                                  matchedRequirements={match.matchedRequirements}
                                />
                              )}
                            </For>
                          </Show>
                        </CollapsibleSection>

                        <Divider theme={theme} />
                      </box>
                    }
                  >
                    {(spec) => (
                      <SpecDetail
                        theme={theme}
                        spec={spec()}
                        renderer={props.api.renderer}
                        query={specQuery}
                        onQuery={setSpecQuery}
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
      </Show>
    </box>
  )
}
