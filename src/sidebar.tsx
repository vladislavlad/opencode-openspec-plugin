import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from "solid-js"
import type { Context } from "@opencode/plugin/tui/context"
import { hasOpenSpecTooling, isComplete, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "./lib/openspec"
import { parseChangeDocs, readChangeArtifacts, type ChangeDocs } from "./lib/change-docs"
import { clearInitMarker, readPluginState, writeInitMarker, type InitStage, type PluginState } from "./lib/config"
import { INIT_DISMISS_PROMPT, buildInitOnlyPrompt, buildInitPrompt } from "./lib/init-prompts"
import { buildUpdatePrompt, type UpdateTargets } from "./lib/update-prompt"
import { checkVersions, semverGt, type Update } from "./lib/updates"
import { buildMigrationPrompt, hasMigrations } from "./lib/migrations"
import { decideMigration, readLastVersion, recordVersion } from "./lib/version-history"
import { deleteChange } from "./lib/delete-change"
import { quitOpencode, sendPrompt, submitPrompt } from "./lib/send-prompt"
import { projectLocation, sessionRunning } from "./lib/location"
import { themeColors } from "./lib/theme"
import { BackButton, Button, CollapsibleSection, Divider, ProgressBar, type Gate } from "./components/primitives"
import { ChangeDetail, ChangeRow } from "./components/changes"
import { RequirementDetail, SpecDetail, SpecNodeView, SpecRow, buildTree, findNode, parentArea } from "./components/specs"
import { SearchField } from "./components/search"
import { SettingsView } from "./components/settings"
import {
  ToolingReloadBanner,
  InitBanner,
  InitScreen,
  InitStatus,
  toolingBanner,
  initIncomplete,
  needsInit as needsInitDecision,
  setupStage,
  type ToolingResult,
} from "./components/init-flow"
import { PostUpdateBanner, UpdateBanner } from "./components/update-flow"
import { searchSpecs } from "./lib/search"
import { VERSION } from "./lib/version"
import { hasWorkflowSkills } from "./lib/openspec-tooling"

const NO_PLUGIN_STATE: PluginState = { update: null, init: { inProgress: false, done: [] }, toolingVersion: null }

// The sidebar root: owns the single poll, every signal and the agent's busy state, and renders the
// list or a drill-in detail view. The setup and update flows get their values from here – they never
// poll or subscribe on their own.
export function OpenSpecSidebar(props: { api: Context; sessionId: string; baselineAvailable: boolean }) {
  const theme = () => themeColors(props.api.theme)
  const [summary, setSummary] = createSignal<OpenSpecSummary | null>(null, { equals: summaryEquals })
  // null while the first load is in flight, so we don't flash the Init screen on startup.
  const [initialised, setInitialised] = createSignal<boolean | null>(null)
  const [changesOpen, setChangesOpen] = createSignal(false)
  const [completedOpen, setCompletedOpen] = createSignal(false)
  const [specsOpen, setSpecsOpen] = createSignal(false)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [selectedSpec, setSelectedSpec] = createSignal<string | null>(null)
  const [selectedReq, setSelectedReq] = createSignal<string | null>(null)
  // The area the Specifications list is showing, as a path ("" = the root). Opening a spec keeps it,
  // so coming back from the detail view lands where the user was.
  const [currentArea, setCurrentArea] = createSignal("")
  // proposal.md / design.md of the open change; null while they're being read.
  const [changeDocs, setChangeDocs] = createSignal<ChangeDocs | null>(null)
  const [hovered, setHovered] = createSignal<string | null>(null)
  const [specQuery, setSpecQuery] = createSignal("")
  // false once we know the init /opsx-* commands aren't loaded (written this session but not loaded yet).
  const [commandsReady, setCommandsReady] = createSignal<boolean | null>(null)
  // Hold the status line until the foreground and its background subagents settle.
  const [setupInProgress, setSetupInProgress] = createSignal(false)
  const [setupFailed, setSetupFailed] = createSignal(false) // the init turn ended without tooling
  const [toolingResult, setToolingResult] = createSignal<ToolingResult>("idle")
  const [showSettings, setShowSettings] = createSignal(false)
  const [headerHover, setHeaderHover] = createSignal(false)
  const [dot, setDot] = createSignal(0) // 0..2 – which of the "Initializing" dots is lit
  const [pluginUpdate, setPluginUpdate] = createSignal<Update | null>(null)
  const [cliLatest, setCliLatest] = createSignal<string | null>(null)
  const [legacyToolingVersion, setLegacyToolingVersion] = createSignal<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = createSignal(false)
  const [reloadPending, setReloadPending] = createSignal(false)
  // The whole `plugin:` block from config.yaml, filled by one read per poll: the setup marker drives
  // the status line, the interrupted banner and Resume; the update flag drives the post-update banner.
  const [pluginState, setPluginState] = createSignal<PluginState>(NO_PLUGIN_STATE)
  // Last version from the synchronously hydrated durable V2 store.
  const [lastVersion, setLastVersion] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)
  let pendingToolingReload = false // refresh the native catalog after Init or Refresh OpenSpec
  let pendingReload = false // offer to restart after a plugin update
  let pendingVersionRecord = false // stamp storage once the migration turn ends

  const location = projectLocation(props.api, props.sessionId)
  let disposed = false
  onCleanup(() => { disposed = true })
  const client: FileClient = {
    list: (path) => props.api.client.file.list({ location, path }).then((r) => r.data.map((entry) => ({ name: entry.path.replace(/\/+$/, "").split("/").pop()!, type: entry.type }))),
    read: (path) => props.api.client.file.read({ location, path }).then((bytes) => new TextDecoder().decode(bytes)),
  }

  // ---- derived state ------------------------------------------------------

  const activeList = createMemo(() => summary()?.changes.filter((c) => !isComplete(c)) ?? [])
  const completedList = createMemo(() => summary()?.changes.filter(isComplete) ?? [])
  const specMatches = createMemo(() => searchSpecs(summary()?.specs ?? [], specQuery()))
  // A query searches the whole tree, so while one is active the grouping goes away and the results
  // are one flat list – otherwise a match would sit behind a click, and the header would count specs
  // the user can't see.
  const filtering = () => specQuery().trim() !== ""
  const specTree = createMemo(() => buildTree(summary()?.specs ?? []))
  // Fall back to the root when the area disappears – files can move between polls. The node is what
  // the section renders, header included, so a stale path can't outlive the area it names.
  const areaNode = createMemo(() => findNode(specTree(), currentArea()) ?? specTree())
  const activeTotal = createMemo(() => activeList().reduce((sum, c) => sum + c.totalTasks, 0))
  const activeDone = createMemo(() => activeList().reduce((sum, c) => sum + c.completedTasks, 0))

  // Agent mid-turn – used to disable actions and hide the reload prompt.
  const busy = createMemo(() => sessionRunning(props.api, props.sessionId))
  const actionsDisabled = () => busy() || submitting()
  const toastBusy = () => props.api.ui.toast.show({ variant: "info", message: "Wait until the agent finishes working" })
  const gate: Gate = { disabled: actionsDisabled, onDisabledClick: toastBusy }
  const allowAction = () => {
    if (disposed) return false
    if (!actionsDisabled()) return true
    toastBusy()
    return false
  }
  // Runs `action` as an agent turn, unless one is already going.
  const whenIdle = (action: () => void) => { if (allowAction()) action() }
  // Reserve the gate before touching completion flags. A rejected second click must not clear
  // the first request's state while the host still reports idle. Keep host busy separate: only
  // its running-to-idle transition means an agent turn completed.
  const submitAction = async (action: () => Promise<void>) => {
    if (!allowAction()) return
    setSubmitting(true)
    try { await action() }
    finally { if (!disposed) setSubmitting(false) }
  }

  const initState = () => pluginState().init
  const stage = createMemo(() => setupStage(initState()))
  const initStopped = createMemo(() => initIncomplete({ init: initState(), busy: busy(), setupInProgress: setupInProgress() }))
  const needsInit = createMemo(() => needsInitDecision({ initialised: initialised(), init: initState() }))
  const cliCurrent = createMemo(() => pluginState().toolingVersion ?? legacyToolingVersion())
  const cliUpdate = createMemo(() => {
    const current = cliCurrent()
    const next = cliLatest()
    return current && next && semverGt(next, current) ? { current, next } : null
  })
  const updateAvailable = createMemo(() => pluginUpdate() != null || cliUpdate() != null)

  // Offer a retry when native tooling reload failed.
  const banner = createMemo(() =>
    toolingBanner({ busy: busy(), commandsReady: commandsReady(), init: initState(), tooling: toolingResult() }),
  )

  // What to do about the version we're running on. Two sources – the flag an update turn left in
  // config.yaml, and a version bump that happened outside the sidebar entirely. The whole table
  // lives in `decideMigration`; here it's only wired to signals and rendered.
  const migration = createMemo(() =>
    decideMigration({ flag: pluginState().update, last: lastVersion(), current: VERSION, hasEntries: hasMigrations }),
  )

  let historyRead = false
  let recording = false
  const saveVersion = async () => {
    if (recording || disposed) return
    recording = true
    if (await recordVersion(props.api)) {
      if (!disposed) setLastVersion(VERSION)
    }
    recording = false
  }
  const syncVersionHistory = () => {
    if (!historyRead) {
      historyRead = true
      setLastVersion(readLastVersion(props.api))
    }
    const decision = migration()
    if (decision.show === "none" && decision.record) void saveVersion()
  }

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
  // proposal.md and design.md are read once, when a change is opened – never on the poll, which
  // already costs one read per change and per spec every 3s. They barely change after the proposal
  // turn, unlike tasks.md, which stays in the poll.
  createEffect(() => {
    const name = selected()
    setChangeDocs(null)
    if (!name) return
    void readChangeArtifacts(client, name).then((artifacts) => {
      if (!disposed && selected() === name) setChangeDocs(parseChangeDocs(artifacts))
    })
  })

  const openChange = (change: string) => show({ change })
  const openSpec = (spec: string) => show({ spec })
  // Entering an area is a selection like any other, so it clears the detail views; leaving goes one
  // level up, not all the way to the root.
  const openArea = (path: string) => {
    show({})
    setCurrentArea(path)
  }
  const leaveArea = () => setCurrentArea((path) => parentArea(path))
  const openRequirement = (req: string) => show({ spec: selectedSpec() ?? undefined, req })
  const backToList = () => show({})
  const backToSpec = () => show({ spec: selectedSpec() ?? undefined })

  // ---- actions ------------------------------------------------------------

  // `resume` keeps the recorded stages and skips them; Init starts over from scratch. The marker is
  // stamped and the state re-read before the turn is submitted, so Resume never builds its prompt
  // from a poll that's up to 3s stale – and survives an agent that dies on its first tool call.
  const startInit = (resume: boolean) => submitAction(async () => {
    setSetupInProgress(true)
    setToolingResult("idle")
    setSetupFailed(false)
    pendingToolingReload = true

    const marked = await writeInitMarker(props.api, !resume)
    const state = await readPluginState(client)
    if (disposed) return
    setPluginState(state)

    const stageDone = (s: InitStage) => resume && state.init.done.includes(s)
    const done = { tooling: stageDone("tooling"), config: stageDone("config"), specs: stageDone("specs") }
    const sent = await submitPrompt(
      props.api,
      props.baselineAvailable ? buildInitPrompt(done, marked) : buildInitOnlyPrompt(marked),
    )
    if (!sent) { setSetupInProgress(false); pendingToolingReload = false }
  })
  const initOpenSpec = () => void startInit(false)
  const resumeInit = () => void startInit(true)
  // Dropping the marker is a plain yaml edit, so do it here and refresh – no agent turn needed.
  // Only when we can't reach the file does it cost the user a turn.
  const dismissInit = () =>
    void clearInitMarker(props.api).then((cleared) =>
      cleared ? void load() : whenIdle(() => void submitPrompt(props.api, INIT_DISMISS_PROMPT)),
    )

  const sendUpdate = (targets: UpdateTargets) =>
    void submitAction(async () => {
      if (targets.plugin) pendingReload = true
      if (targets.cli) pendingToolingReload = true
      const sent = await submitPrompt(props.api, buildUpdatePrompt(targets))
      if (!sent) {
        if (targets.plugin) pendingReload = false
        if (targets.cli) pendingToolingReload = false
      }
    })
  const completeUpdate = () => {
    const d = migration()
    if (d.show !== "migrate") return
    void submitAction(async () => {
      pendingVersionRecord = true
      const sent = await submitPrompt(props.api, buildMigrationPrompt(d.range, { clearFlag: d.fromFlag }))
      if (!sent) pendingVersionRecord = false
    })
  }

  // Hit the npm registry once per directory (or per manual Check Versions), never on a poll. A fresh
  // check re-shows a dismissed banner. Available updates aren't toasted – they show in the banner.
  const runVersionCheck = async (notify = false) => {
    const s = await checkVersions(client)
    if (disposed) return
    setCliLatest(s.cliLatest)
    setLegacyToolingVersion(s.legacyToolingVersion)
    setPluginUpdate(s.plugin)
    setBannerDismissed(false)
    if (!notify) return
    if (!s.pluginLatest && !s.cliLatest) props.api.ui.toast.show({ variant: "warning", message: "Couldn't reach npm registry" })
    else if (s.pluginLatest && s.cliLatest && !s.plugin && !cliUpdate() && cliCurrent()) props.api.ui.toast.show({ variant: "success", message: "All versions are up to date" })
  }

  // Ask the V2 host to rebuild its native catalog after tooling is written.
  const reloadTooling = async () => {
    try {
      await props.api.client.location.reload()
      const catalogs = await readCatalogs()
      if (disposed) return
      const ready = catalogs.legacy === true || catalogs.skills === true
      setCommandsReady(ready)
      setToolingResult(ready ? "loaded" : "failed")
    } catch {
      if (!disposed) setToolingResult("failed")
    }
  }

  const readCatalogs = async () => {
    const [legacy, skills] = await Promise.all([
      props.api.client.command.list({ location }).then((r) => r.data.some((c) => c.name === "opsx-propose")).catch(() => null),
      props.api.client.skill.list({ location }).then((r) => hasWorkflowSkills(r.data.map((skill) => skill.name))).catch(() => null),
    ])
    return { legacy, skills }
  }

  // ---- polling ------------------------------------------------------------

  let loading: Promise<void> | undefined
  function load() {
    return loading ??= readSidebar().finally(() => { loading = undefined })
  }

  async function readSidebar() {
    if (disposed) return
    try {
      const s = await readOpenSpec(client)
      if (disposed) return
      setSummary(s)
      const [catalogs, projectTooling, state] = await Promise.all([
        readCatalogs(),
        s && hasOpenSpecTooling(client),
        readPluginState(client),
      ])
      if (disposed) return
      setInitialised(s !== null && (catalogs.skills === true || projectTooling === true))
      // One read of the `plugin:` block per poll, feeding both flows, so the banners clear as soon
      // as the agent removes their markers.
      setPluginState(state)
      if (catalogs.legacy === true || catalogs.skills === true) setCommandsReady(true)
      else if (catalogs.legacy === false && catalogs.skills === false) setCommandsReady(false)
      syncVersionHistory()
    } catch {
      if (disposed) return
      setSummary(null)
      setInitialised(false)
    }
  }

  createEffect(() => {
    const dir = location.directory
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

  // Read after the idle transition, even if a poll that started before it is still in flight.
  const finishSetup = async (isCurrent: () => boolean) => {
    if (loading) await loading
    if (!isCurrent()) return
    await load()
    if (!isCurrent()) return
    setSetupInProgress(false)
    setSetupFailed(initialised() !== true)
    if (pendingToolingReload) {
      pendingToolingReload = false
      void reloadTooling()
    }
  }

  // The init/update turn ends on busy→idle. sawBusy guards against firing before it has started.
  let sawBusy = false
  createEffect(() => {
    if (busy()) {
      sawBusy = true
      if (initState().inProgress) setSetupInProgress(true)
      return
    }
    if (!sawBusy) return
    sawBusy = false
    if (setupInProgress()) {
      let cancelled = false
      onCleanup(() => { cancelled = true })
      void finishSetup(() => !cancelled && !disposed && !busy())
    } else if (pendingToolingReload) {
      pendingToolingReload = false
      void reloadTooling().then(load)
    }
    if (pendingReload) {
      pendingReload = false
      setReloadPending(true)
    }
    if (pendingVersionRecord) {
      pendingVersionRecord = false
      void saveVersion()
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

      <PostUpdateBanner theme={theme} decision={migration} onComplete={completeUpdate} onReopen={() => quitOpencode(props.api)} gate={gate} />

      <Show when={banner() !== "none"}>
        <ToolingReloadBanner theme={theme} onReload={() => whenIdle(() => void reloadTooling())} gate={gate} />
      </Show>

      {/* Hidden when the native command reload failed. */}
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
            <box paddingLeft={2}>
              <ProgressBar theme={theme} done={activeDone()} total={activeTotal()} showNumberOfTasks />
            </box>
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
          <Show
            when={!filtering()}
            fallback={
              <For each={specMatches()}>
                {(match) => (
                  <SpecRow
                    theme={theme}
                    spec={match.spec}
                    hovered={hovered}
                    setHovered={setHovered}
                    onSelect={openSpec}
                    matchedRequirements={match.matchedRequirements}
                    showPath
                  />
                )}
              </For>
            }
          >
            <SpecNodeView
              theme={theme}
              node={areaNode()}
              hovered={hovered}
              setHovered={setHovered}
              onSelectArea={openArea}
              onSelectSpec={openSpec}
              onBack={leaveArea}
            />
          </Show>
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

      <Show when={setupInProgress() && !showSettings()}>
        <InitStatus theme={theme} stage={stage} dot={dot} />
      </Show>

      <Show when={!showSettings() && initStopped()}>
        <InitBanner theme={theme} stage={stage} gate={gate} onResume={resumeInit} onDismiss={dismissInit} />
      </Show>

      <Show when={showSettings()}>
        <SettingsView
          theme={theme}
          cliCurrent={cliCurrent}
          cliLatest={cliLatest}
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
        <InitScreen
          theme={theme}
          aborted={() => setupFailed() || initState().inProgress}
          onInit={initOpenSpec}
          gate={gate}
        />
      </Show>

      <Show when={!showSettings() && !needsInit() && initialised() === true && summary()}>
        <Switch fallback={<ListView />}>
          <Match when={selectedChange()}>
            {(change) => (
              <ChangeDetail
                theme={theme}
                change={change()}
                docs={changeDocs()}
                onBack={backToList}
                // Apply/Update open an editable dialog; Archive submits.
                onCommand={(text, submit) => void (submit ? submitPrompt(props.api, text) : sendPrompt(props.api, text))}
                onDelete={(name) => void deleteChange(props.api, name, allowAction)}
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
