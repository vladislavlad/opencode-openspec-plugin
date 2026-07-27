// The setup flow's own views and decisions. The sidebar root owns the polling and the signals; this
// module only turns their values into what's on screen. The decision helpers are plain functions –
// no Solid – so they're testable without a live TUI.
import { Show } from "solid-js"
import type { Theme } from "../lib/theme"
import { INIT_STAGES, type InitStage, type InitState } from "../lib/config"
import { Button, Divider, NotInitialised, type Gate } from "./primitives"

// ---- decisions ------------------------------------------------------------

// The first stage the agent hasn't checkpointed; "validate" once all three are recorded.
export const setupStage = (init: InitState): InitStage | "validate" =>
  INIT_STAGES.find((s) => !init.done.includes(s)) ?? "validate"

// Interrupted mid-setup. Before the tooling checkpoint we offer Init instead, so the banner waits.
export const initIncomplete = (s: { init: InitState; busy: boolean; setupInProgress: boolean }) =>
  s.init.inProgress && s.init.done.includes("tooling") && !s.busy && !s.setupInProgress

// Setup owns the screen until tooling is checkpointed.
export const needsInit = (s: { initialised: boolean | null; init: InitState }) =>
  s.initialised === false || (s.initialised === true && s.init.inProgress && !s.init.done.includes("tooling"))

export type EphemeralResult = "idle" | "loaded" | "failed"

// The restart prompt above the action row: none while busy/native/mid-setup, warn if the /opsx-*
// files were bridged ephemerally, error if that failed. Held back during setup so Reload and Resume
// never compete.
export const ephemeralBanner = (s: {
  busy: boolean
  commandsReady: boolean | null
  init: InitState
  ephemeral: EphemeralResult
}): "none" | "warn" | "error" => {
  if (s.busy || s.commandsReady === true || s.init.inProgress) return "none"
  if (s.ephemeral === "loaded") return "warn"
  if (s.ephemeral === "failed") return "error"
  return "none"
}

// What the status line says while a stage runs, and what the banner says if it stopped there.
const SETUP_LABELS: Record<InitStage | "validate", { phase: string; stopped: string }> = {
  tooling: { phase: "Installing OpenSpec", stopped: "while installing OpenSpec" },
  config: { phase: "Configuring project", stopped: "while configuring the project" },
  specs: { phase: "Deriving specs", stopped: "while deriving specs" },
  validate: { phase: "Validating specs", stopped: "while validating specs" },
}

// ---- views ----------------------------------------------------------------

// Status line over the content (not instead of it) so specs fill in live during setup.
export function InitStatus(props: { theme: Theme; stage: () => InitStage | "validate"; dot: () => number }) {
  const t = props.theme
  const lit = (i: number) => (props.dot() === i ? t().text : t().textMuted)
  return (
    <box paddingBottom={1}>
      <text fg={t().textMuted}>
        {SETUP_LABELS[props.stage()].phase}
        <span style={{ fg: lit(0) }}>.</span>
        <span style={{ fg: lit(1) }}>.</span>
        <span style={{ fg: lit(2) }}>.</span>
      </text>
    </box>
  )
}

// Shown when config.yaml still carries the init marker but no turn is running – setup was interrupted.
export function InitBanner(props: {
  theme: Theme
  stage: () => InitStage | "validate"
  onResume: () => void
  onDismiss: () => void
  gate: Gate
}) {
  const t = props.theme
  return (
    <box paddingBottom={1}>
      <text fg={t().warning} wrapMode="word">{`Initialization stopped ${SETUP_LABELS[props.stage()].stopped}`}</text>
      <box flexDirection="row" gap={2} paddingTop={1}>
        <Button theme={t} label="Resume" color={t().secondary} {...props.gate} onClick={props.onResume} />
        <Button theme={t} label="Dismiss" color={t().warning} onClick={props.onDismiss} />
      </box>
      <Divider theme={t} />
    </box>
  )
}

// The Init screen, with the warning shown when a previous turn ended without tooling.
export function InitScreen(props: { theme: Theme; aborted: () => boolean; onInit: () => void; gate: Gate }) {
  const t = props.theme
  return (
    <box>
      <Show when={props.aborted()}>
        <box paddingBottom={1}>
          <text fg={t().warning} wrapMode="word">Setup aborted – press "Init" to continue</text>
        </box>
      </Show>
      <NotInitialised theme={t} onInit={props.onInit} gate={props.gate} />
    </box>
  )
}

// Same prompt whether the ephemeral bridge took or not – only a restart loads the commands properly.
export function EphemeralReloadBanner(props: { theme: Theme; onReload: () => void; gate: Gate }) {
  const t = props.theme
  return (
    <box paddingBottom={1}>
      <text fg={t().warning} wrapMode="word">Reload opencode to activate new commands and skills</text>
      <box flexDirection="row" paddingTop={1}>
        <Button theme={t} label="Reload OpenCode" color={t().error} {...props.gate} onClick={props.onReload} />
      </box>
    </box>
  )
}
