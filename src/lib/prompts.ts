// Prompts the sidebar submits to the model. Multi-line ones are arrays joined with "\n" so the ```
// fences inside them don't end a template literal.

import { INIT_STAGES, type InitStage } from "./config"
import { CLI_PKG, PLUGIN_PKG } from "./updates"

// ---- scaffolding command --------------------------------------------------

// Scaffolds openspec/ + the opencode /opsx-* commands and skills (CLI must be on PATH — see preflight).
export const OPENSPEC_INIT_CMD = `openspec init --tools opencode`

// ---- how to talk to the user ----------------------------------------------

// Prepended to every prompt that talks to the user — asking or reporting. Without it a model
// answering a Russian user writes "пропазалы": the term transliterated instead of kept as `proposal`.
export const SPEAK_THE_USER_LANGUAGE =
  "Write questions, options and summaries in the language the user writes to you in. Keep OpenSpec terms in English — proposal, change, spec, requirement, scenario, task. Never transliterate them."

// ---- /opsx-config: project context ----------------------------------------

// Infer stack/language/context into openspec/config.yaml, so every OpenSpec artifact is generated
// with that context and in the chosen language. The "is openspec set up?" guard is for the standalone
// `/opsx-config` only — inside the init prompt, the install step right above just set it up.
const configPrompt = (standalone: boolean) => [
  "Set up or update `openspec/config.yaml`. Keep `schema: spec-driven` unchanged — you only edit `context` and `rules`.",
  ...(standalone ? ["", "If there is no `openspec/` directory, tell me to run OpenSpec init first and stop."] : []),
  "",
  "1. Read `openspec/config.yaml`; use any existing `context`/`rules` as defaults.",
  "2. Skim the README and package manifests (package.json, pyproject.toml, go.mod, Cargo.toml). Your AGENTS.md context is already loaded. Infer: tech stack, the language the docs are written in, a 2-4 sentence project summary, and a fitting writing style.",
  "   - If the project is empty or new (no code, README or manifests to read), treat the context as unknown and go straight to step 3 with no pre-filled suggestions — the user provides everything there. Do NOT offer to create or pick a different project.",
  "3. Ask with the `question` tool (one call):",
  '   - "Stack" (multi-select): the tech stack. Offer the stack you detected as one option.',
  '   - "Language" (single): the natural (human) language the specs are written in. NEVER propose programming or markup languages. Offer the language detected from the docs and "English".',
  '   - "Context" (multi-select): a 2-4 sentence project summary. Offer your summary as one option.',
  '   - "Style" (single): "Technical", "Product", or "Balanced".',
  '   "Stack" and "Context" must have multiple selection turned ON — the user has to be able to pick several options at once, not one.',
  '   On those two, the user may tick your option, tick it and add more via "Type your own answer", or type their own. Merge what they pick and type.',
  '4. Ask "Configure detailed rules?" (single: "Yes" / "No").',
  "   - No: skip the rules questions and write the config.",
  "   - Yes: ask one more `question` call:",
  '     - "Proposal" (single): detail level — "Brief", "Standard", "Detailed".',
  '     - "Non-goals" (single): "Yes" / "No" — always require a Non-goals section in proposals?',
  '     - "Tasks" (single): breakdown granularity — "High-level" (a few high-level tasks) or "Detailed" (sub-tasks grouped under high-level sections).',
  '5. Turn those answers into short rules under `rules.proposal` / `rules.tasks`. Proposal detail: Brief = keep it short / Standard = default / Detailed = add rationale and alternatives. Non-goals Yes = add "Always include a Non-goals section". Tasks: High-level = a few broad top-level tasks / Detailed = sub-tasks grouped under high-level sections. Keep any existing rules for `specs` and `design`.',
  "6. Write `openspec/config.yaml` and report what you wrote. Keep `schema: spec-driven`, and keep any existing `plugin:` block byte-for-byte — it holds plugin state.",
  "   - `context` is one multi-line block. Its content, in order:",
  "     1. the tech stack",
  "     2. the spec language",
  "     3. this line, copied verbatim: \"Write requirement statements, scenarios and task text in the language above. Keep unchanged: OpenSpec keywords (Purpose, Requirements, Requirement, Scenario, SHALL, WHEN, THEN) and code identifiers (class/function/file names, API terms).\"",
  "     4. the writing style",
  "     5. the 2-4 sentence summary",
  "   - `rules.proposal` and `rules.tasks` are lists of short rules; omit the `rules:` block entirely if the user set none. Leave any existing `rules.specs` / `rules.design` exactly as they are.",
]

// `/opsx-config` runs on its own, so it checks that openspec is there before configuring anything.
export const CONFIG_PROMPT = [SPEAK_THE_USER_LANGUAGE, "", ...configPrompt(true)].join("\n")

// ---- /opsx-baseline: specs from existing code -----------------------------

// The depth of the pass, asked before any code is read: settling the capability list is already
// studying the project. Each caller asks in its own way — the derive body below just follows the
// answer, so it carries no branch of its own.
const DEPTH_OPTIONS = '"Overview" reads entry points and main modules; "Deep" follows the real code paths, including error handling and edge cases — much slower and far more tokens.'

const DEPTH_QUESTION = [
  `Before reading anything, ask with the \`question\` tool (single, header "Depth"): how deeply to study the project — "Overview" or "Deep"? ${DEPTH_OPTIONS}`,
  "That answer is the depth for everything below.",
].join("\n")

// The spec-derivation stage: reverse-engineer specs from existing code, phased with subagents so a
// small model never has to hold the whole codebase at once. The depth is already chosen by the time
// this runs.
const SPEC_DERIVE_PROMPT = [
  "Reverse-engineer OpenSpec specs from the existing code — describe what the project does today. Write specs only: no changes, no code edits.",
  "",
  "Look for three things: what the project does for whoever uses it, the integrations and external systems it depends on, and the behavior it implements itself instead of taking from a library. All three are capabilities.",
  "",
  "Not every project is an application. In an infrastructure, configuration or tooling repository the declared setup is the behavior: what it provisions, how the parts are wired, what it guarantees to the person running it. Describe that the same way.",
  "",
  "First read `openspec/config.yaml` and follow its `context` (especially the spec language).",
  "",
  "A spec = ONE cohesive capability (e.g. `authentication`, `billing`, `change-list`). Sizing rules:",
  "- Several focused specs beat one big spec.",
  "- Aim for ~4-8 requirements per spec. If one would exceed ~10, split it.",
  "- But not one spec per file or function.",
  "",
  "Each capability is `openspec/specs/<capability>/spec.md` (kebab-case name), in this shape:",
  "",
  "```",
  "## Purpose",
  "<1-2 sentences: what this capability does>",
  "",
  "## Requirements",
  "",
  "### Requirement: <Short Name>",
  "The system SHALL <one verifiable behavior the code implements>.",
  "",
  "#### Scenario: <Short Name>",
  "- **WHEN** <trigger>",
  "- **THEN** <outcome>",
  "```",
  "",
  "Every requirement uses SHALL and has at least one WHEN/THEN scenario. Keep them atomic.",
  "Write ALL prose in the config language — the requirement statement (e.g. `Система SHALL …`), scenario text, everything. Keep unchanged only: the structural tokens `## Purpose`, `## Requirements`, `### Requirement:`, `#### Scenario:`, SHALL, WHEN, THEN, and code identifiers (class/function/file names). Don't leave `The system SHALL …` in English.",
  "",
  "Work in phases so you never hold the whole codebase at once:",
  "",
  'Phase 1 — Orient. Skim README, top-level folders, manifests, entry points, routes; on "Deep", also read through each area\'s code instead of guessing capabilities from folder names. Output a capability list: name, one-line purpose, main paths. Skip Phases 2-4 only when the directory is empty or holds nothing but a README — config files, manifests and scripts are capabilities, so a repository made of them does not qualify.',
  "Phase 2 — Confirm. Ask with the `question` tool which of the capabilities you just listed should get specs. One option per capability, named as in your list. Turn multiple selection ON: the user has to be able to pick several options at once, not one. Let them type capabilities of their own as well. Keep only what they pick.",
  'Phase 3 — Detail, one capability at a time. For each, spawn a subagent with the Task tool that reads only that capability\'s code and writes or merges its `spec.md`. Take the agent type from the list that tool itself offers and pick a general one — do not invent a type name. Pass it the name, purpose, paths, language, chosen depth, and guardrails. On "Overview" it reads entry points and main modules; on "Deep" it follows that capability\'s code paths end to end and captures error handling and edge cases as their own scenarios. If the Task tool is missing or offers no general agent, do the capabilities one at a time yourself — do not retry with a guessed type.',
  "Phase 4 — Validate. Run `openspec validate --specs`, fix failures, then summarize what you created vs updated and flag anything unsure.",
  "",
  "Guardrails:",
  "- Several cohesive specs, not one giant one, and not one per file.",
  "- Follow the language and context from `openspec/config.yaml`.",
  "- Merge, don't duplicate: extend existing specs, never delete correct content.",
  "- Only real, implemented behavior — note gaps, don't invent.",
  '- "Deep" is not "open every file": whatever the depth, skip tests, fixtures, generated and vendored code.',
  "- Write only under `openspec/specs/`. Never touch `openspec/changes/` or code. Edit `openspec/config.yaml` only where this prompt explicitly says to.",
  "- Idempotent: re-running refines, never duplicates.",
].join("\n")

// `/opsx-baseline`: require the config (else point to /opsx-config), then derive specs from the code.
export const SPEC_BASELINE_PROMPT = [
  SPEAK_THE_USER_LANGUAGE,
  "",
  "First check: if `openspec/config.yaml` does not exist or has no `context` block, tell me to run `/opsx-config` first and stop.",
  "",
  DEPTH_QUESTION,
  "",
  SPEC_DERIVE_PROMPT,
].join("\n")

// ---- init: the pieces -----------------------------------------------------

// Step 1 exists so an interrupted setup is resumable. The sidebar writes the marker itself whenever
// it can reach the files, and then only has to tell the agent to leave it alone.
const markerStep = (written: boolean) =>
  written
    ? "1. `openspec/config.yaml` already exists and holds a `plugin.init` setup marker — the sidebar wrote it. Do not change or remove that block until this prompt explicitly says to; `openspec init` will not touch it."
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
// binary on PATH for the generated /opsx-* commands to shell out to.
const initPreflight = (markerWritten: boolean) =>
  [
    "Set up OpenSpec in this project. First make sure the `openspec` CLI is installed — the generated /opsx-* commands run it.",
    "",
    markerStep(markerWritten),
    "2. Run `openspec --version`. If it succeeds, the CLI is installed — skip to step 6.",
    "3. If the CLI is missing, detect which package managers exist: run `npm -v`, `pnpm -v`, `yarn -v`, `bun --version` and keep the ones that succeed.",
    '4. Ask with the `question` tool (single-select), header "Install": "The OpenSpec CLI is required but not installed. It will be installed globally. Choose a package manager:". Offer one option per detected manager, plus "Cancel". If the user picks "Cancel", clean up and end the turn right there — nothing below this step runs. Cleaning up means: remove the `init:` block from `openspec/config.yaml`; if the file then holds nothing but `schema`, delete it; if `openspec/` is then empty, remove the directory too.',
    "5. Install `@fission-ai/openspec@latest` globally using the chosen package manager (npm: `install -g`, pnpm/bun: `add -g`, yarn: `global add`).",
    `6. Run \`${OPENSPEC_INIT_CMD}\`. If it fails: report the error, leave \`openspec/config.yaml\` and its marker as they are (the sidebar will offer Resume), and stop. Re-running it on an already set up project is safe — it refreshes the tooling and leaves config.yaml, specs and changes alone.`,
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
// alongside the install step, the "No" clause only alongside the derive gate. Steps are linear —
// the failure branch ends the turn, so everything after it is the success path.
const initFinally = (has: { install: boolean; specs: boolean }) =>
  [
    "## Finally",
    "",
    [
      has.specs
        ? 'Run this section whenever you reach it — including when the user answered "No" to deriving specs.'
        : "Run this section whenever you reach it.",
      ...(has.install
        ? ["Do not run it after a stop above (a cancelled install or a failed `openspec init`): those end the turn immediately."]
        : []),
    ].join(" "),
    "1. Run `openspec validate --specs` and fix what it reports — unless you already ran it in this turn. Skip it when the project has no specs.",
    "2. If validation still fails after your fixes: leave the `init:` block in place (the sidebar will offer Resume), report what is broken, and end the turn.",
    `3. Then ${CLEAR_MARKER}.`,
    "4. Tell the user OpenSpec is set up and ready. Then show the two ways to start — both buttons are in the sidebar:",
    "   - **Explore** — describe an idea and OpenSpec explores it with you. Similar to `/opsx-explore <describe your idea>`.",
    "   - **Propose** — describe a feature and OpenSpec drafts the change proposal. Similar to `/opsx-propose <describe the feature to implement>`.",
    "   Also point at `/opsx-baseline`: if the specs don't cover the whole project yet, running it again refines and extends what is there instead of duplicating it.",
  ].join("\n")

// ---- init: the prompts the sidebar sends ----------------------------------

export type InitDone = Record<InitStage, boolean>

export const NO_STAGES_DONE: InitDone = { tooling: false, config: false, specs: false }

// Init button and Resume: install + init, configure, derive specs — minus the stages already done.
// `markerWritten` says the sidebar already stamped `plugin.init`, so the agent needn't create it.
export function buildInitPrompt(done: InitDone = NO_STAGES_DONE, markerWritten = false): string {
  const parts: string[] = [SPEAK_THE_USER_LANGUAGE, ""]
  if (INIT_STAGES.some((s) => done[s])) {
    parts.push("Resume the interrupted OpenSpec setup. Do not redo anything listed as already done.", "")
  }

  if (done.tooling) parts.push("Already done: the OpenSpec CLI and its `.opencode` tooling are installed — do NOT run `openspec init` again.", "")
  else parts.push("## Install step", "", initPreflight(markerWritten), "", recordStage("tooling"), "")

  if (done.config) parts.push("Already done: `openspec/config.yaml` is configured — leave its `context` and `rules` as they are.", "")
  else parts.push("## Config step", "", configPrompt(false).join("\n"), "", recordStage("config"), "")

  if (done.specs) parts.push("Already done: specs were derived.", "")
  else
    parts.push(
      "## Specs step",
      "",
      `Ask with the \`question\` tool (one call), header "Specs": "Config is set. Derive specs from the existing project now?" with options "Yes — Overview", "Yes — Deep" and "No". ${DEPTH_OPTIONS}`,
      'If "No", skip straight to the Finally section below — do not stop before it. Otherwise that answer is the depth for everything below:',
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
  "Change nothing else — do not run any setup step and do not touch specs or changes.",
].join("\n")

// Fallback when `/opsx-baseline` failed to register: ensure the CLI + init, then clear the marker so
// setup doesn't stay flagged as unfinished with no way to continue.
export const buildInitOnlyPrompt = (markerWritten = false) =>
  [SPEAK_THE_USER_LANGUAGE, "", initPreflight(markerWritten), "", `Then ${CLEAR_MARKER}. Do not configure the project and do not derive specs.`].join(
    "\n",
  )

// ---- update ---------------------------------------------------------------

// What an update turn should touch. Plugin carries `current` so the agent can stamp the migration
// flag; CLI only needs the target. Fields are independent — Update All passes both.
export interface UpdateTargets {
  plugin?: { current: string; next: string }
  cli?: { next: string }
}

// The plugin is bumped by editing its `tui.json` specifier (opencode reinstalls on restart), the CLI
// by a global install + `openspec update`. Only the plugin block writes the migration flag.
export function buildUpdatePrompt(t: UpdateTargets): string {
  const parts = ["Update the OpenSpec tooling as described below. Do ONLY the steps listed — do not touch anything else."]
  if (t.plugin) {
    parts.push(
      "",
      "## Update the plugin",
      `1. Find the \`tui.json\` that registers this plugin — check \`<project>/.opencode/tui.json\` first, then \`~/.config/opencode/tui.json\`. Its \`"plugin"\` array contains \`"${PLUGIN_PKG}"\` (optionally with a \`@version\` suffix). The entry may be a plain string or a \`["${PLUGIN_PKG}", { …options }]\` tuple — edit the string part.`,
      `   - If that entry is a local filesystem path (e.g. it ends in \`dist/index.js\`), this is a dev checkout: SKIP the plugin update and tell me so.`,
      `2. Set the specifier to \`"${PLUGIN_PKG}@${t.plugin.next}"\`.`,
      "3. In `openspec/config.yaml`, add this block (keep `schema`, `context`, `rules` intact; create the file with `schema: spec-driven` if it doesn't exist yet):",
      "```yaml",
      "plugin:",
      "  update-in-progress:",
      `    old: ${t.plugin.current}`,
      `    new: ${t.plugin.next}`,
      "```",
    )
  }
  if (t.cli) {
    parts.push(
      "",
      "## Update the openspec CLI",
      "1. Detect which package manager owns the global `openspec` binary (`npm -v`, `pnpm -v`, `yarn -v`, `bun --version`) and install the new version globally:",
      `   npm: \`npm i -g ${CLI_PKG}@${t.cli.next}\` · pnpm/bun: \`add -g\` · yarn: \`global add\`.`,
      "2. Run `openspec update --force` to regenerate the `.opencode` commands and skills.",
    )
  }
  parts.push("", "## Finally", "Tell me to reopen opencode to apply the update.")
  return parts.join("\n")
}
