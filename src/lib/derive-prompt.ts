// `/opsx-baseline`: reverse-engineer specs from existing code. The init prompt embeds the same body,
// asking the depth question its own way. Multi-line prompts are arrays joined with "\n" so the ```
// fences inside them don't end a template literal.
import { MULTI_SELECT_RULE, SPEAK_THE_USER_LANGUAGE } from "./prompt-style"

// The depth of the pass, asked before any code is read: settling the capability list is already
// studying the project. Each caller asks in its own way — the derive body below just follows the
// answer, so it carries no branch of its own.
export const DEPTH_OPTIONS = '"Overview" reads entry points and main modules; "Deep" follows the real code paths, including error handling and edge cases — much slower and far more tokens.'

const DEPTH_QUESTION = [
  `Before reading anything, ask with the \`question\` tool (single, header "Depth"): how deeply to study the project — "Overview" or "Deep"? ${DEPTH_OPTIONS}`,
  "That answer is the depth for everything below.",
].join("\n")

// The spec-derivation stage: reverse-engineer specs from existing code, phased with subagents so a
// small model never has to hold the whole codebase at once. The depth is already chosen by the time
// this runs.
export const SPEC_DERIVE_PROMPT = [
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
  `Phase 2 — Confirm. Ask with the \`question\` tool which of the capabilities you just listed should get specs. One option per capability, named as in your list. Turn multiple selection ON: ${MULTI_SELECT_RULE}. Let them type capabilities of their own as well. Keep only what they pick.`,
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
