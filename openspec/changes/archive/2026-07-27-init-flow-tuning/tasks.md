## 1. Preflight beginning

- [x] 1.1 Figure out why the agent ran `mkdir -p <project>/openspec` in a live run: check what `markerWritten` the prompt is assembled with when the sidebar can write files (`writeInitMarker` → `editable` → `writeLocal`), and whether `editable` returns `null` on a clean project. **Found:** screenshot was taken on release `0.2.1`, where the marker mechanism doesn't exist at all – `markerStep`/`writeInitMarker` appeared in an uncommitted commit `7ba53e1`. The `mkdir` was agent initiative over an old prompt
- [x] 1.2 Fix the found cause in `src/lib/config.ts` / `src/sidebar.tsx` so that `markerWritten` is `true` everywhere the marker is actually written. Don't add anything about this to the prompt. **No changes needed:** in the current tree, the sidebar writes config.yaml itself, `markerStep(true)` contains no file creation instructions, and the path "clean project → marker written" is already covered by test `test/init-marker.test.ts` ("creates the directory and file when the project has no openspec/ yet")
- [x] 1.3 Re-read the assembled prompt in full (`buildInitPrompt(NO_STAGES_DONE, true)`) and confirm that the beginning didn't grow by a single line: the prompt text doesn't change at all for this point

## 2. Task granularity with two options

- [x] 2.1 In `CONFIG_PROMPT`, replace the "Tasks" question with two options: "High-level" (a few high-level tasks) and "Detailed" (sub-tasks grouped under high-level sections)
- [x] 2.2 Rewrite step 5 for two options: High-level → several large top-level tasks, Detailed → sub-tasks grouped by major sections. Remove all mentions of "Coarse", "Medium", "Fine" and time estimates
- [x] 2.3 Test in `test/prompts.test.ts`: prompt contains both new options. Don't create a check for absence of old words – it guards something that's no longer in the code

## 3. Exploration depth at the derivation stage

- [x] 3.1 Move the depth question ("Overview" / "Deep") from the derivation body to the calling side: `DEPTH_QUESTION` for `/opsx-baseline`, three-option gate in `buildInitPrompt`. The derivation body remains single and doesn't branch
- [x] 3.2 Account for depth in phase 1 (on "Deep", the capability list is assembled from read code, not folder layout) and pass it to the sub-agent in phase 3: Overview – entry points and main modules; Deep – all capability code including error handling and edge cases, with separate scenarios for them
- [x] 3.3 Tests in `test/prompts.test.ts`: `/opsx-baseline` asks depth as a separate phase 0, init – gate "Yes – Overview / Yes – Deep / No" without a repeated question; phase 0 comes before phase 1. Plus check that "Deep" is stated as not "every file"

## 4. Prompt review edits

- [x] 4.1 `INIT_FINALLY`: tie marker removal to validation so an empty project passes, and don't run `openspec validate --specs` again after derivation phase 4
- [x] 4.2 Derivation constraints: allow editing `openspec/config.yaml` where a step outside the list asks for it – otherwise `recordStage` contradicts the guardrail
- [x] 4.3 `/opsx-baseline` description in `src/features/commands.ts` and `README.md` – remove promise of setup that the prompt doesn't perform
- [x] 4.4 `CONFIG_PROMPT` step 6: replace YAML example with a prose file description, keeping the requirement not to lose `rules.specs` / `rules.design` and the `plugin:` block
- [x] 4.5 `buildUpdatePrompt`: create `openspec/config.yaml` if it doesn't exist
- [x] 4.6 Minor things: consistent `/opsx-propose` in final section, capital letter in empty project text, grammar in language question
- [x] 4.7 In derivation, name what we're looking for: business features, integrations, and standalone technical solutions (own engine, scheduler, parser). Don't restate stack and architecture – they're already in config.yaml and AGENTS.md
- [x] 4.8 Cancel branch: replace uncheckable "exist only for this setup" with a mechanical rule – remove `init:`, delete config.yaml only if it contains nothing but `schema`, delete `openspec/` only if empty
- [x] 4.9 `INIT_FINALLY`: replace "always" with "execute when you reach here", naming cancelled CLI installation as the only path past this section
- [x] 4.10 `configPrompt(standalone)`: stub "no openspec/ – go run init" stays only in `/opsx-config`, doesn't enter init prompt
- [x] 4.11 Check whether CLI supports `.openspec/` root. **Does not support:** in `@fission-ai/openspec@1.6.0`, the path is set by constant `OPENSPEC_DIR_NAME = 'openspec'`, no alternatives in code
- [x] 4.12 Remove `.openspec` from plugin: `ROOT` in `src/lib/openspec.ts`, `CONFIG_PATH` in `src/lib/config.ts`, single path in `src/lib/delete-change.ts`, `root` field from `OpenSpecSummary`; remove corresponding tests and bring `openspec/specs/openspec-parsing` and `openspec/specs/plugin-lifecycle` to a single root
- [x] 4.13 Marker step in `markerStep(false)`: separate "file exists" (add block, don't touch anything else) from "file doesn't exist" (create with directory, writing `schema` and block) instead of the merged "creating ... and keeping any content already there"
- [x] 4.14 Final section: name both stops (Cancel – marker already removed; failed `openspec init` – marker intentionally left for Resume) instead of "only path is Cancel"; tie marker removal to passed validation; on failing validation – report what's broken and don't invite to Explore/Propose
- [x] 4.15 Proofread for 9b-27b: marker instruction moved into step 6 itself (stop = instruction in place), success greeting, derivation exit on empty project, idioms ("shell out", "right-size", "off the folder layout") replaced with direct language, `context` in setup step 6 – numbered list
- [x] 4.16 `initFinally({install, specs})` instead of constant: phrases about stops and "No" only for corresponding steps; final points are linear (validation failure ends turn, "skip step 3" not needed); "confirm what you wrote" → "report", "custom on" → plain language
- [x] 4.17 Add `SPEAK_THE_USER_LANGUAGE` at the beginning of prompts that ask questions (`/opsx-config`, `/opsx-baseline`, init, fallback init): dialogue in user's language, OpenSpec terms without transliteration; in init – once, not with each nested stage
- [x] 4.18 Same guard in `buildMigrationPrompt` – release notes are relayed to the user, same transliteration risk
- [x] 4.19 Following a live run on an infrastructure repository: expand derivation framing to projects that aren't applications (declared configuration is also behavior), and narrow phase exit condition to "empty or single README"
- [x] 4.20 Remove hardcoded `subagent_type "general-purpose"` from phase 3: type comes from the Task tool list, when no suitable agent – sequential breakdown without retries with a guessed type
- [x] 4.21 Multi-select as a separate instruction in confirmation phase and "Stack"/"Context" questions; rephrase phase 2 question to "for which of the listed capabilities to write specs"
- [x] 4.22 Add `/opsx-baseline` mention to greeting: if specs didn't cover the whole project, a re-run supplements them rather than duplicates

## 5. Verification and release

- [x] 5.1 Run `bun run typecheck`, `bun run test`, `bun run build`
- [x] 5.2 Walk through init manually on a clean project. **Ran on dev-env (qwen3.6-27b):** no `mkdir` at turn start, task question is binary, depth is asked by gate before scanning. Found and fixed along the way: `subagent_type "general-purpose"` (opencode doesn't know this type), derivation collapse on infrastructure repository, multi-select in parentheses instead of instruction
- [x] 5.3 Run `/opsx-baseline` on a project with already configured config and verify that the depth question is asked there too
- [x] 5.4 Add entry to `MIGRATIONS` (`src/lib/migrations.ts`) – questions change that the user sees in init and baseline
