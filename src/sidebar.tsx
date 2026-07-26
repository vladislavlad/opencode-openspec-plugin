import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { Theme } from "./lib/theme"
import { hasOpenSpecTooling, isComplete, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "./lib/openspec"
import { INIT_STAGES, clearInitMarker, readPluginState, writeInitMarker, type InitStage, type InitState, type UpdateFlag } from "./lib/config"
import {
  INIT_DISMISS_PROMPT,
  buildInitOnlyPrompt,
  buildInitPrompt,
  buildUpdatePrompt,
  type UpdateTargets,
} from "./lib/prompts"
import { checkVersions, type Update } from "./lib/updates"
import { buildMigrationPrompt, hasMigrations } from "./lib/migrations"
import { decideMigration, readLastVersion, recordVersion } from "./lib/version-history"
import { deleteChange } from "./lib/delete-change"
import { quitOpencode, sendPrompt, submitPrompt } from "./lib/send-prompt"
import { registerOpsxFsCommands } from "./features/commands"
import { BackButton, Button, CollapsibleSection, Divider, NotInitialised, ProgressBar, type Gate } from "./components/primitives"
import { ChangeDetail, ChangeRow } from "./components/changes"
import { RequirementDetail, SpecDetail, SpecRow } from "./components/specs"
import { SearchField } from "./components/search"
import { SettingsView } from "./components/settings"
import { searchSpecs } from "./lib/search"
import { VERSION } from "./lib/version"

// What the status line says while a stage runs, and what the banner says if it stopped there.
const SETUP_LABELS: Record<InitStage | "validate", { phase: string; stopped: string }> = {
  tooling: { phase: "Installing OpenSpec", stopped: "while installing OpenSpec" },
  config: { phase: "Configuring project", stopped: "while configuring the project" },
  specs: { phase: "Deriving specs", stopped: "while deriving specs" },
  validate: { phase: "Validating specs", stopped: "while validating specs" },
}

// Banner above the action row when an update is available.
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

// Shown when config.yaml still carries the init marker but no turn is running — setup was interrupted.
function InitBanner(props: { theme: Theme; stoppedAt: () => string; onResume: () => void; onDismiss: () => void; gate: Gate }) {
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
export function OpenSpecSidebar(props: { api: TuiPluginApi; sessionId: string; baselineAvailable: boolean }) {
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
  // Init pressed; hold the status line until the agent goes idle.
  const [setupInProgress, setSetupInProgress] = createSignal(false)
  const [setupFailed, setSetupFailed] = createSignal(false) // the init turn ended without tooling
  const [ephemeralResult, setEphemeralResult] = createSignal<"idle" | "loaded" | "failed">("idle")
  const [showSettings, setShowSettings] = createSignal(false)
  const [headerHover, setHeaderHover] = createSignal(false)
  const [dot, setDot] = createSignal(0) // 0..2 — which of the "Initializing" dots is lit
  const [pluginUpdate, setPluginUpdate] = createSignal<Update | null>(null)
  const [cliUpdate, setCliUpdate] = createSignal<Update | null>(null)
  const [cliCurrent, setCliCurrent] = createSignal<string | null>(null)
  const [updateFlag, setUpdateFlag] = createSignal<UpdateFlag | null>(null)
  const [bannerDismissed, setBannerDismissed] = createSignal(false)
  const [reloadPending, setReloadPending] = createSignal(false)
  // Setup marker from config.yaml: drives the status line, the interrupted banner and Resume.
  const [initState, setInitState] = createSignal<InitState>({ inProgress: false, done: [] })
  // Last version this plugin ran as, from `kv`. Filled in on the first poll where `kv` is ready.
  const [lastVersion, setLastVersion] = createSignal<string | null>(null)
  let pendingEphemeral = false // register the /opsx-* files once the init turn ends
  let pendingReload = false // show the reload prompt once an update turn ends
  let pendingVersionRecord = false // stamp `kv` once the migration turn ends

  const client: FileClient = {
    list: (path) => props.api.client.file.list({ path }).then((r) => r?.data ?? []),
    read: (path) => props.api.client.file.read({ path }).then((r) => r?.data?.content ?? ""),
  }

  // ---- derived state ------------------------------------------------------

  const activeList = createMemo(() => summary()?.changes.filter((c) => !isComplete(c)) ?? [])
  const completedList = createMemo(() => summary()?.changes.filter(isComplete) ?? [])
  const specMatches = createMemo(() => searchSpecs(summary()?.specs ?? [], specQuery()))
  const activeTotal = createMemo(() => activeList().reduce((sum, c) => sum + c.totalTasks, 0))
  const activeDone = createMemo(() => activeList().reduce((sum, c) => sum + c.completedTasks, 0))

  // Agent mid-turn — used to disable actions and hide the reload prompt.
  const busy = createMemo(() => {
    const st = props.api.state.session.status(props.sessionId)
    return st?.type === "busy" || st?.type === "retry"
  })
  const toastBusy = () => props.api.ui.toast({ variant: "info", message: "Wait until the agent finishes working" })
  const gate: Gate = { disabled: busy, onDisabledClick: toastBusy }
  // Runs `action` as an agent turn, unless one is already going.
  const whenIdle = (action: () => void) => (busy() ? void toastBusy() : action())

  const stageDone = (stage: InitStage) => initState().done.includes(stage)
  // The first stage the agent hasn't checkpointed; "validate" once all three are recorded.
  const setupStage = createMemo<InitStage | "validate">(() => INIT_STAGES.find((s) => !stageDone(s)) ?? "validate")
  // Interrupted mid-setup. Before the tooling checkpoint we offer Init instead, so the banner waits.
  const initIncomplete = createMemo(() => initState().inProgress && stageDone("tooling") && !busy() && !setupInProgress())
  // Setup owns the screen until tooling is checkpointed.
  const needsInit = createMemo(
    () => initialised() === false || (initialised() === true && initState().inProgress && !stageDone("tooling")),
  )
  const updateAvailable = createMemo(() => pluginUpdate() != null || cliUpdate() != null)

  // What to do about the version we're running on. Two sources — the flag an update turn left in
  // config.yaml, and a version bump that happened outside the sidebar entirely. The whole table
  // lives in `decideMigration`; here it's only wired to signals and rendered.
  const migration = createMemo(() =>
    decideMigration({ flag: updateFlag(), last: lastVersion(), current: VERSION, hasEntries: hasMigrations }),
  )
  const reopenTarget = createMemo(() => {
    const d = migration()
    return d.show === "reopen" ? d.range.new : null
  })
  const canMigrate = createMemo(() => migration().show === "migrate")

  // `kv` loads asynchronously, so read it on the poll rather than at mount — reading it too early
  // looks like "no record" and would silently swallow the banner.
  let kvRead = false
  const syncVersionHistory = () => {
    if (!props.api.kv.ready) return
    if (!kvRead) {
      kvRead = true
      setLastVersion(readLastVersion(props.api))
    }
    const decision = migration()
    if (decision.show === "none" && decision.record) {
      recordVersion(props.api)
      setLastVersion(VERSION)
    }
  }

  // Above the action row: none while busy/native/mid-setup, warn if bridged ephemerally, error if
  // that failed. Held back during setup so Reload and Resume never compete.
  const banner = createMemo<"none" | "warn" | "error">(() => {
    if (busy() || commandsReady() === true || initState().inProgress) return "none"
    if (ephemeralResult() === "loaded") return "warn"
    if (ephemeralResult() === "failed") return "error"
    return "none"
  })

  // Resolved from the live summary so detail views keep updating while polling.
  const selectedChange = createMemo(() => summary()?.changes.find((c) => c.name === selected()) ?? null)
  const selectedSpecData = createMemo(() => summary()?.specs.find((s) => s.name === selectedSpec()) ?? null)
  const selectedRequirement = createMemo(
    () => selectedSpecData()?.requirements.find((r) => r.name === selectedReq()) ?? null,
  )

  // ---- navigation ---------------------------------------------------------

  // Selections are mutually exclusive. Hover is cleared because an unmounted row never fires onMouseOut.
  const show = (next: { change?: string; spec?: string; req?: string }) => {
    setHovered(null)
    setSelected(next.change ?? null)
    setSelectedSpec(next.spec ?? null)
    setSelectedReq(next.req ?? null)
  }
  const openChange = (change: string) => show({ change })
  const openSpec = (spec: string) => show({ spec })
  const openRequirement = (req: string) => show({ spec: selectedSpec() ?? undefined, req })
  const backToList = () => show({})
  const backToSpec = () => show({ spec: selectedSpec() ?? undefined })

  // ---- actions ------------------------------------------------------------

  // `resume` keeps the recorded stages and skips them; Init starts over from scratch. The marker is
  // stamped and the state re-read before the turn is submitted, so Resume never builds its prompt
  // from a poll that's up to 3s stale — and survives an agent that dies on its first tool call.
  const startInit = async (resume: boolean) => {
    setSetupInProgress(true)
    setEphemeralResult("idle")
    setSetupFailed(false)
    pendingEphemeral = true

    const marked = await writeInitMarker(props.api, !resume)
    const state = await readPluginState(client).then((s) => s.init)
    setInitState(state)

    const stage = (s: InitStage) => resume && state.done.includes(s)
    const done = { tooling: stage("tooling"), config: stage("config"), specs: stage("specs") }
    void submitPrompt(
      props.api,
      props.baselineAvailable ? buildInitPrompt(done, marked) : buildInitOnlyPrompt(marked),
    )
  }
  const initOpenSpec = () => void startInit(false)
  const resumeInit = () => void startInit(true)
  // Dropping the marker is a plain yaml edit, so do it here and refresh — no agent turn needed.
  // Only when we can't reach the file does it cost the user a turn.
  const dismissInit = () =>
    void clearInitMarker(props.api).then((cleared) =>
      cleared ? void load() : whenIdle(() => void submitPrompt(props.api, INIT_DISMISS_PROMPT)),
    )

  const sendUpdate = (targets: UpdateTargets) =>
    whenIdle(() => {
      pendingReload = true
      void submitPrompt(props.api, buildUpdatePrompt(targets))
    })
  const completeUpdate = () => {
    const d = migration()
    if (d.show !== "migrate") return
    whenIdle(() => {
      pendingVersionRecord = true
      void submitPrompt(props.api, buildMigrationPrompt(d.range, { clearFlag: d.fromFlag }))
    })
  }

  // Hit the npm registry once per directory (or per manual Check Versions), never on a poll. A fresh
  // check re-shows a dismissed banner. Available updates aren't toasted — they show in the banner.
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

  // After the init turn the /opsx-* files are on disk; register them ephemerally to bridge the
  // restart gap.
  const installEphemeral = async () => {
    if (commandsReady() === true) return // already loaded natively
    const n = await registerOpsxFsCommands(props.api, client.read)
    setEphemeralResult(n > 0 ? "loaded" : "failed")
  }

  // ---- polling ------------------------------------------------------------

  let loading = false
  async function load() {
    if (loading) return
    loading = true
    try {
      const s = await readOpenSpec(client)
      setSummary(s)
      setInitialised(s !== null && (await hasOpenSpecTooling(client)))
      // Cheap read every poll so the banners clear once the agent removes their markers.
      const state = await readPluginState(client)
      setUpdateFlag(state.update)
      setInitState(state.init)
      // Are the init commands actually loaded? Stay optimistic on a fetch error.
      const cmds = await props.api.client.command
        .list()
        .then((r) => r?.data ?? null)
        .catch(() => null)
      if (cmds) setCommandsReady(cmds.some((c) => c.name === "opsx-propose"))
      syncVersionHistory()
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
    void runVersionCheck()
    const id = setInterval(load, 3000)
    onCleanup(() => clearInterval(id)) // createEffect's return value isn't a cleanup; clear here so intervals don't stack
  })

  // Move the lit "Initializing" dot while setup runs.
  createEffect(() => {
    if (!setupInProgress()) return setDot(0)
    const id = setInterval(() => setDot((d) => (d + 1) % 3), 500)
    onCleanup(() => clearInterval(id))
  })

  // The init/update turn ends on busy→idle. sawBusy guards against firing before it has started.
  let sawBusy = false
  createEffect(() => {
    if (busy()) return void (sawBusy = true)
    if (!sawBusy) return
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
    if (pendingVersionRecord) {
      pendingVersionRecord = false
      recordVersion(props.api)
      setLastVersion(VERSION)
    }
  })

  // Expand a section the first time it has items; after that the user's toggling wins.
  const autoOpenOnce = (count: () => number, open: (v: boolean) => void) => {
    let opened = false
    createEffect(() => {
      if (opened || count() === 0) return
      opened = true
      open(true)
    })
  }
  autoOpenOnce(() => activeList().length, setChangesOpen)
  autoOpenOnce(() => completedList().length, setCompletedOpen)
  autoOpenOnce(() => summary()?.specs.length ?? 0, setSpecsOpen)

  // ---- views --------------------------------------------------------------

  // The list screen: banners, the action row, and the three collapsible sections.
  const ListView = () => (
    <box>
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

      {/* An update turn ran, but the build it installed isn't the one loaded yet. */}
      <Show when={reopenTarget()}>
        {(target) => (
          <box paddingBottom={1}>
            <text fg={theme().warning} wrapMode="word">{`Reopen opencode to finish updating to ${target()}`}</text>
          </box>
        )}
      </Show>

      <Show when={canMigrate()}>
        <box paddingBottom={1}>
          <text fg={theme().textMuted} wrapMode="word">Run checks after update</text>
          <box flexDirection="row" paddingTop={1}>
            <Button theme={theme} label="Complete Update" color={theme().accent} {...gate} onClick={completeUpdate} />
          </box>
        </box>
      </Show>

      {/* Same prompt whether the ephemeral bridge took or not — only a restart loads them properly. */}
      <Show when={banner() !== "none"}>
        <box paddingBottom={1}>
          <text fg={theme().warning} wrapMode="word">Reload opencode to activate new commands and skills</text>
          <box flexDirection="row" paddingTop={1}>
            <Button theme={theme} label="Reload OpenCode" color={theme().error} {...gate} onClick={() => quitOpencode(props.api)} />
          </box>
        </box>
      </Show>

      {/* Hidden when the bridge failed: the /opsx-* commands these fill in wouldn't resolve. */}
      <Show when={banner() !== "error"}>
        <box flexDirection="row" gap={2}>
          <Button theme={theme} label="Explore" color={theme().accent} {...gate} onClick={() => void sendPrompt(props.api, "/opsx-explore ")} />
          <Button theme={theme} label="Propose" color={theme().secondary} {...gate} onClick={() => void sendPrompt(props.api, "/opsx-propose ")} />
          <Show when={completedList().length > 0}>
            {/* One completed change → archive it directly; several → let the command prompt. */}
            <Button
              theme={theme}
              label="Archive"
              color={theme().success}
              {...gate}
              onClick={() =>
                void submitPrompt(
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
          {(change) => <ChangeRow theme={theme} change={change} hovered={hovered} setHovered={setHovered} onSelect={openChange} />}
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
          {(change) => <ChangeRow theme={theme} change={change} hovered={hovered} setHovered={setHovered} onSelect={openChange} />}
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
        <SearchField theme={theme} renderer={props.api.renderer} value={specQuery} onInput={setSpecQuery} placeholder="Search specs" />
        <Show when={specMatches().length > 0} fallback={<text fg={theme().textMuted}>{"  No matches"}</text>}>
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
  )

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
            {SETUP_LABELS[setupStage()].phase}
            <span style={{ fg: dot() === 0 ? theme().text : theme().textMuted }}>.</span>
            <span style={{ fg: dot() === 1 ? theme().text : theme().textMuted }}>.</span>
            <span style={{ fg: dot() === 2 ? theme().text : theme().textMuted }}>.</span>
          </text>
        </box>
      </Show>

      <Show when={!showSettings() && initIncomplete()}>
        <InitBanner
          theme={theme}
          stoppedAt={() => SETUP_LABELS[setupStage()].stopped}
          gate={gate}
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
          gate={gate}
        />
      </Show>

      <Show when={!setupInProgress() && !showSettings() && needsInit()}>
        <Show when={setupFailed() || initState().inProgress}>
          <box paddingBottom={1}>
            <text fg={theme().warning} wrapMode="word">Setup aborted – press "Init" to continue</text>
          </box>
        </Show>
        <NotInitialised theme={theme} onInit={initOpenSpec} gate={gate} />
      </Show>

      <Show when={!showSettings() && !needsInit() && initialised() === true && summary()}>
        <Switch fallback={<ListView />}>
          <Match when={selectedChange()}>
            {(change) => (
              <ChangeDetail
                theme={theme}
                change={change()}
                onBack={backToList}
                // Apply/Update fill the prompt; Archive submits.
                onCommand={(text, submit) => void (submit ? submitPrompt(props.api, text) : sendPrompt(props.api, text))}
                onDelete={(name) => void deleteChange(props.api, name)}
                gate={gate}
              />
            )}
          </Match>
          <Match when={selectedRequirement()}>
            {(req) => <RequirementDetail theme={theme} req={req()} onBack={backToSpec} />}
          </Match>
          <Match when={selectedSpecData()}>
            {(spec) => (
              <SpecDetail
                theme={theme}
                spec={spec()}
                renderer={props.api.renderer}
                query={specQuery}
                onQuery={setSpecQuery}
                onOpenReq={openRequirement}
                onBack={backToList}
              />
            )}
          </Match>
        </Switch>
      </Show>
    </box>
  )
}
