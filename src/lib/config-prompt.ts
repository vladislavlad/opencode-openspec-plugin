// `/opsx-config`: infer stack/language/context into openspec/config.yaml, so every OpenSpec artifact
// is generated with that context and in the chosen language. Multi-line prompts are arrays joined
// with "\n" so the ``` fences inside them don't end a template literal.
import { MULTI_SELECT_RULE, SPEAK_THE_USER_LANGUAGE } from "./prompt-style"

// The "is openspec set up?" guard is for the standalone `/opsx-config` only – inside the init prompt,
// the install step right above just set it up.
export const configPrompt = (standalone: boolean) => [
  "Set up or update `openspec/config.yaml`. Keep `schema: spec-driven` unchanged – you only edit `context` and `rules`.",
  ...(standalone ? ["", "If there is no `openspec/` directory, tell me to run OpenSpec init first and stop."] : []),
  "",
  "1. Read `openspec/config.yaml`; use any existing `context`/`rules` as defaults.",
  "2. Skim the README and package manifests (package.json, pyproject.toml, go.mod, Cargo.toml). Your AGENTS.md context is already loaded. Infer: tech stack, the language the docs are written in, a 2-4 sentence project summary, and a fitting writing style.",
  "   - If the project is empty or new (no code, README or manifests to read), treat the context as unknown and go straight to step 3 with no pre-filled suggestions – the user provides everything there. Do NOT offer to create or pick a different project.",
  "3. Ask with the `question` tool (one call):",
  '   - "Stack" (multi-select): the tech stack. Offer the stack you detected as one option.',
  '   - "Language" (single): the natural (human) language the specs are written in. NEVER propose programming or markup languages. Offer the language detected from the docs and "English".',
  '   - "Context" (multi-select): a 2-4 sentence project summary. Offer your summary as one option.',
  '   - "Style" (single): "Technical", "Product", or "Balanced".',
  `   "Stack" and "Context" must have multiple selection turned ON – ${MULTI_SELECT_RULE}.`,
  '   On those two, the user may tick your option, tick it and add more via "Type your own answer", or type their own. Merge what they pick and type.',
  '4. Ask "Configure detailed rules?" (single: "Yes" / "No").',
  "   - No: skip the rules questions and write the config.",
  "   - Yes: ask one more `question` call:",
  '     - "Proposal" (single): detail level – "Brief", "Standard", "Detailed".',
  '     - "Non-goals" (single): "Yes" / "No" – always require a Non-goals section in proposals?',
  '     - "Tasks" (single): breakdown granularity – "High-level" (a few high-level tasks) or "Detailed" (sub-tasks grouped under high-level sections).',
  '5. Turn those answers into short rules under `rules.proposal` / `rules.tasks`. Proposal detail: Brief = keep it short / Standard = default / Detailed = add rationale and alternatives. Non-goals Yes = add "Always include a Non-goals section". Tasks: High-level = a few broad top-level tasks / Detailed = sub-tasks grouped under high-level sections. Keep any existing rules for `specs` and `design`.',
  "6. Write `openspec/config.yaml` and report what you wrote. Keep `schema: spec-driven`, and keep any existing `plugin:` block byte-for-byte – it holds plugin state.",
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
