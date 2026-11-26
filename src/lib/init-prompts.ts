// The Init/Resume turn: install the CLI, configure the project, derive specs – minus the stages the
// agent already checkpointed. Embeds the config and derive prompts, so it imports both. Multi-line
// prompts are arrays joined with "\n" so the ``` fences inside them don't end a template literal.
import { INIT_STAGES, type InitStage } from "./config"
import { configPrompt } from "./config-prompt"
import { DEPTH_OPTIONS, SPEC_DERIVE_PROMPT } from "./derive-prompt"
import { SPEAK_THE_USER_LANGUAGE } from "./prompt-style"
import { CLI_PKG, MIN_CLI_VERSION } from "./updates"

// Scaffolds openspec/ and its project workflow skills.
export const OPENSPEC_INIT_CMD = "openspec init --tools opencode --profile core --scope project"

// ---- the pieces -----------------------------------------------------------

// Step 1 exists so an interrupted setup is resumable. The sidebar writes the marker itself whenever
// it can reach the files, and then only has to tell the agent to leave it alone.
const markerStep = (written: boolean) =>
  written
    ? "1. `openspec/config.yaml` already exists and holds a `plugin.init` setup marker – the sidebar wrote it. Do not change or remove that block until this prompt explicitly says to; `openspec init` will not touch it."
    : [
        "1. Put this setup marker into `openspec/config.yaml`, before installing anything:",
        "",
        "```yaml",
        "plugin:",
        "  init:",
        "    in-progress: true",
        "    done: []",
        "```",
        "",
        "   If the file already exists, add the block and change nothing else. If it does not, create the `openspec/` directory and the file, containing `schema: spec-driven` and that block.",
        "   `openspec init` leaves an existing config.yaml untouched, and the sidebar reads this marker to offer a resume if the turn is interrupted.",
      ].join("\n")

// Install the `openspec` CLI globally if missing, then run init. A `npx` one-shot wouldn't leave the
// binary on PATH for workflow skills to use.
const initPreflight = (markerWritten: boolean) =>
  [
    "Set up OpenSpec in this project. First make sure the `openspec` CLI is installed for the workflow skills.",
    "",
    markerStep(markerWritten),
    `2. Run \`openspec --version\`. If it reports ${MIN_CLI_VERSION} or newer, skip to step 6. Otherwise upgrade it.`,
    "3. If the CLI is missing or too old, identify its installation method. Use the official installer for a standalone binary. For a package-managed install, detect available package managers. For npm use Node.js 22.20.0 or newer.",
    '4. Ask with the `question` tool (single-select), header "Install": "OpenSpec 2.2 or newer is required. Choose a package manager for the global installation:". Offer one option per detected manager, plus "Cancel". If the user picks "Cancel", clean up and end the turn right there – nothing below this step runs. Cleaning up means: remove the `init:` block from `openspec/config.yaml`; if the file then holds nothing but `schema`, delete it; if `openspec/` is then empty, remove the directory too.',
    `5. Install or upgrade \`${CLI_PKG}@${MIN_CLI_VERSION}\` globally using the chosen package manager (npm: \`install -g\`, pnpm/bun: \`add -g\`, yarn: \`global add\`).`,
    `6. Run \`${OPENSPEC_INIT_CMD}\`. If it fails: report the error, leave \`openspec/config.yaml\` and its marker as they are (the sidebar will offer Resume), and stop. Re-running it on an already set up project is safe – it refreshes the tooling and leaves config.yaml, specs and changes alone.`,
    "7. After successful initialization, run `openspec --version` again and record the actual `X.Y.Z` result as `plugin.tooling-version` in `openspec/config.yaml`. Preserve the setup marker and all other config fields. If the version check fails, preserve the previous value and report that it could not be verified.",
  ].join("\n")

// The cumulative checkpoint written to `plugin.init.done` after a stage completes.
const recordStage = (upTo: InitStage) => {
  const reached = INIT_STAGES.slice(0, INIT_STAGES.indexOf(upTo) + 1)
  return `Then set \`plugin.init.done\` in \`openspec/config.yaml\` to \`[${reached.map((s) => `"${s}"`).join(", ")}]\`, keeping the rest of the file intact.`
}

// Removing the whole `init:` block is what marks setup as finished.
const CLEAR_MARKER =
  "remove the whole `init:` block under `plugin:` in `openspec/config.yaml`, keeping `schema`, `context`, `rules` and any other `plugin:` entries intact. Drop the `plugin:` block entirely if nothing is left under it"

// Tailored to the steps actually present in this build of the prompt: the stop warning only exists
// alongside the install step, the "No" clause only alongside the derive gate. Steps are linear –
// the failure branch ends the turn, so everything after it is the success path.
const initFinally = (has: { install: boolean; specs: boolean }) =>
  [
    "## Finally",
    "",
    [
      has.specs
        ? 'Run this section whenever you reach it – including when the user answered "No" to deriving specs.'
        : "Run this section whenever you reach it.",
      ...(has.install
        ? ["Do not run it after a stop above (a cancelled install or a failed `openspec init`): those end the turn immediately."]
        : []),
    ].join(" "),
    "1. Run `openspec validate --specs` and fix what it reports – unless you already ran it in this turn. Skip it when the project has no specs.",
    "2. If validation still fails after your fixes: leave the `init:` block in place (the sidebar will offer Resume), report what is broken, and end the turn.",
    `3. Then ${CLEAR_MARKER}.`,
    "4. Tell the user OpenSpec is set up and ready. Then show the two ways to start – both buttons are in the sidebar:",
    "   - **Explore** – describe an idea and OpenSpec explores it with you. It uses the OpenSpec Explore skill.",
    "   - **Propose** – describe a feature and OpenSpec drafts the change proposal. It uses the OpenSpec Propose skill.",
    "   Also point at `/opsx-baseline`: if the specs don't cover the whole project yet, running it again refines and extends what is there instead of duplicating it.",
  ].join("\n")

// ---- the prompts the sidebar sends ----------------------------------------

export type InitDone = Record<InitStage, boolean>

export const NO_STAGES_DONE: InitDone = { tooling: false, config: false, specs: false }

// Init button and Resume: install + init, configure, derive specs – minus the stages already done.
// `markerWritten` says the sidebar already stamped `plugin.init`, so the agent needn't create it.
export function buildInitPrompt(done: InitDone = NO_STAGES_DONE, markerWritten = false): string {
  const parts: string[] = [SPEAK_THE_USER_LANGUAGE, ""]
  if (INIT_STAGES.some((s) => done[s])) {
    parts.push("Resume the interrupted OpenSpec setup. Do not redo anything listed as already done.", "")
  }

  if (done.tooling) parts.push("Already done: the OpenSpec CLI and its project tooling are installed – do NOT run `openspec init` again.", "")
  else parts.push("## Install step", "", initPreflight(markerWritten), "", recordStage("tooling"), "")

  if (done.config) parts.push("Already done: `openspec/config.yaml` is configured – leave its `context` and `rules` as they are.", "")
  else parts.push("## Config step", "", configPrompt(false).join("\n"), "", recordStage("config"), "")

  if (done.specs) parts.push("Already done: specs were derived.", "")
  else
    parts.push(
      "## Specs step",
      "",
      `Ask with the \`question\` tool (one call), header "Specs": "Config is set. Derive specs from the existing project now?" with options "Yes – Overview", "Yes – Deep" and "No". ${DEPTH_OPTIONS}`,
      'If "No", skip straight to the Finally section below – do not stop before it. Otherwise that answer is the depth for everything below:',
      "",
      SPEC_DERIVE_PROMPT,
      "",
      recordStage("specs"),
      "",
    )

  parts.push(initFinally({ install: !done.tooling, specs: !done.specs }))
  return parts.join("\n")
}

// Dismiss on the interrupted-setup banner: drop the marker, touch nothing else.
export const INIT_DISMISS_PROMPT = [
  `Clear the interrupted OpenSpec setup marker: ${CLEAR_MARKER}.`,
  "Change nothing else – do not run any setup step and do not touch specs or changes.",
].join("\n")

// Fallback when `/opsx-baseline` failed to register: ensure the CLI + init, then clear the marker so
// setup doesn't stay flagged as unfinished with no way to continue.
export const buildInitOnlyPrompt = (markerWritten = false) =>
  [SPEAK_THE_USER_LANGUAGE, "", initPreflight(markerWritten), "", `Then ${CLEAR_MARKER}. Do not configure the project and do not derive specs.`].join(
    "\n",
  )
