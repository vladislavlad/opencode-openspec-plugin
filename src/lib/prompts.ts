// Prompts and commands the sidebar submits to the model. Kept text-only so they're easy to tweak.
// The multi-line ones are arrays joined with "\n" so the ``` fences inside don't end a template literal.

// Scaffolds openspec/ + the opencode /opsx-* commands and skills (CLI must be on PATH — see preflight).
export const OPENSPEC_INIT_CMD = `openspec init --tools opencode`

// `/opsx-config`: infer stack/language/context and write them into openspec/config.yaml, so every
// OpenSpec artifact (specs, proposals, …) is generated with that context and in the chosen language.
export const CONFIG_PROMPT = [
  "Set up or update `openspec/config.yaml`. Keep `schema: spec-driven` unchanged — you only edit `context` and `rules`.",
  "",
  "If there is no `openspec/` directory, tell me to run OpenSpec init first and stop.",
  "",
  "1. Read `openspec/config.yaml`; use any existing `context`/`rules` as defaults.",
  "2. Skim the README and package manifests (package.json, pyproject.toml, go.mod, Cargo.toml). Your AGENTS.md context is already loaded. Infer: tech stack, the language the docs are written in, a 2-4 sentence project summary, and a fitting writing style.",
  "   - If the project is empty or new (no code, README or manifests to read), treat the context as unknown and go straight to step 3 with no pre-filled suggestions — the user provides everything there. Do NOT offer to create or pick a different project.",
  "3. Ask with the `question` tool (one call):",
  '   - "Stack" (multi-select): the tech stack. Offer the stack you detected as one option.',
  '   - "Language" (single): the natural (human) language the specs are written in. NEVER propose a programming or markup languages. Offer the language detected from the docs and "English".',
  '   - "Context" (multi-select): a 2-4 sentence project summary. Offer your summary as one option.',
  '   - "Style" (single): "Technical", "Product", or "Balanced".',
  '   On multi-select, the user may tick your option, tick it and add more via "Type your own answer", or type their own. Merge what they pick and type.',
  '4. Ask "Configure detailed rules?" (single: "Yes" / "No").',
  "   - No: skip the rules questions and write the config.",
  "   - Yes: ask one more `question` call:",
  '     - "Proposal" (single): detail level — "Brief", "Standard", "Detailed".',
  '     - "Non-goals" (single): "Yes" / "No" — always require a Non-goals section in proposals?',
  '     - "Tasks" (single): breakdown granularity — "Coarse", "Medium", "Fine".',
  '5. Turn those answers into short rules under `rules.proposal` / `rules.tasks`. Proposal detail: Brief = keep it short / Standard = default / Detailed = add rationale and alternatives. Non-goals Yes = add "Always include a Non-goals section". Tasks: Coarse = a few high-level tasks / Medium = ~half-day tasks / Fine = small ~1-2h tasks with sub-tasks. Keep any existing rules for `specs` and `design`.',
  "6. Write `openspec/config.yaml` and confirm what you wrote. Omit the `rules:` block entirely if the user set no rules. Example:",
  "",
  "```yaml",
  "schema: spec-driven",
  "context: |",
  "  Tech stack: <stack>",
  "  Language: <language>",
  "  Write requirement statements, scenarios and task text in the language above. Keep unchanged: OpenSpec keywords (Purpose, Requirements, Requirement, Scenario, SHALL, WHEN, THEN) and code identifiers (class/function/file names, API terms).",
  "  Writing style: <style>",
  "  <2-4 sentence summary>",
  "rules:",
  "  proposal:",
  "    - <proposal rules, only if chosen>",
  "  tasks:",
  "    - <tasks rule, only if chosen>",
  "```",
].join("\n")

// The spec-derivation stage: reverse-engineer specs from existing code. Several focused, right-sized
// capabilities (not one giant spec, not one-per-file); phased with subagents to spare small models.
const SPEC_DERIVE_PROMPT = [
  "Reverse-engineer OpenSpec specs from the existing code — describe what the project does today. Write specs only: no changes, no code edits.",
  "",
  "First read `openspec/config.yaml` and follow its `context` (especially the spec language).",
  "",
  "A spec = ONE cohesive capability (e.g. `authentication`, `billing`, `change-list`). Right-size it:",
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
  "Work in phases so you never hold the whole codebase at once (the model may be small):",
  "",
  "Phase 1 — Orient. Skim README, top-level folders, manifests, entry points, routes. Don't open every file. Output a capability list: name, one-line purpose, main paths.",
  'Phase 2 — Confirm. Show the list via the `question` tool (multi-select, one option per capability, custom on so the user can add one). Keep only what the user confirms.',
  'Phase 3 — Detail, one capability at a time. For each, spawn a subagent (Task tool, subagent_type "general-purpose") that reads only that capability\'s code and writes or merges its `spec.md`. Pass it the name, purpose, paths, language, and guardrails. If the Task tool is unavailable, do them one at a time yourself.',
  "Phase 4 — Validate. Run `openspec validate --specs`, fix failures, then summarize what you created vs updated and flag anything unsure.",
  "",
  "Guardrails:",
  "- Several cohesive specs, not one giant one, and not one per file.",
  "- Follow the language and context from `openspec/config.yaml`.",
  "- Merge, don't duplicate: extend existing specs, never delete correct content.",
  "- Only real, implemented behavior — note gaps, don't invent.",
  "- Write only under `openspec/specs/`. Never touch `openspec/changes/` or code.",
  "- Idempotent: re-running refines, never duplicates.",
].join("\n")

// `/opsx-baseline`: require the config (else point to /opsx-config), then derive specs from the code.
export const SPEC_BASELINE_PROMPT = [
  "First check: if `openspec/config.yaml` does not exist or has no `context` block, tell me to run `/opsx-config` first and stop.",
  "",
  SPEC_DERIVE_PROMPT,
].join("\n")

// Preflight for the Init button: ensure the `openspec` CLI is available — the generated /opsx-*
// commands shell out to it — installing it globally with the user's chosen package manager if it is
// missing, then run init. A `npx` one-shot would not leave the CLI on PATH for later commands.
const OPENSPEC_INIT_PREFLIGHT = [
  "Set up OpenSpec in this project. First ensure the `openspec` CLI is available — the generated commands shell out to it.",
  "",
  "1. Run `openspec --version`. If it succeeds, the CLI is installed — skip to step 5.",
  "2. If it is missing, detect which package managers exist: run `npm -v`, `pnpm -v`, `yarn -v`, `bun --version` and keep the ones that succeed.",
  '3. Ask with the `question` tool (single-select), header "Install": "The OpenSpec CLI is required but not installed. It will be installed globally. Choose a package manager:". Offer one option per detected manager, plus "Cancel". If the user picks "Cancel", stop immediately and do nothing else.',
  "4. Install `@fission-ai/openspec@latest` globally using the chosen package manager (npm: `install -g`, pnpm/bun: `add -g`, yarn: `global add`).",
  `5. Run \`${OPENSPEC_INIT_CMD}\`. If it fails, report the error and stop.`,
].join("\n")

// Init button: ensure the CLI + init, always set up config, then optionally derive specs.
export const OPENSPEC_INIT_PROMPT = [
  OPENSPEC_INIT_PREFLIGHT,
  "6. Once init succeeds, always continue with the steps below — do not stop and do not skip Step 1.",
  "",
  "Step 1 — Config (always, do this first). Set up openspec/config.yaml:",
  "",
  CONFIG_PROMPT,
  "",
  'Step 2 — Ask with the `question` tool: header "Specs", "Config is set. Derive specs from the existing project now?", options "Yes" / "No".',
  'If "No", stop. If "Yes", do this:',
  "",
  SPEC_DERIVE_PROMPT,
  "",
  "Finally, once setup is done:",
  '- If the project was empty and no specs were derived, tell the user exactly (two lines):',
  '  project directory is empty, so no specs were derived. When you\'re ready to implement features, run:',
  '  /opsx-propose "describe the feature to implement"',
  "- Otherwise, invite them to create their first change proposal with `/opsx-propose <describe the feature to implement>`.",
].join("\n")

// Fallback when `/opsx-baseline` failed to register: just ensure the CLI + init, no follow-up.
export const OPENSPEC_INIT_ONLY_PROMPT = OPENSPEC_INIT_PREFLIGHT
