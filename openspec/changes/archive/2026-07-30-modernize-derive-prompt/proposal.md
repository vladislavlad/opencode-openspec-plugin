## Why

The `/opsx-baseline` derive prompt predates the shape the standard commands settled into. Read next to `opsx-propose`, `opsx-sync` and `opsx-archive`, what it lacks is not styling — it is the guarantees those commands give the agent:

- **Where to write.** The prompt hardcodes `openspec/specs/...`; sync resolves the root from CLI output and says so.
- **What already exists.** The prompt tells the agent not to duplicate work, without telling it how to find out what is there. Sync names one authoritative source for its inputs and forbids inferring them.
- **What counts as failure.** Sync and archive stop before writing on a bad lookup and re-check the result afterwards. Derive has one exit condition — an empty repository — and never verifies that the specs it asked for exist.
- **What to report.** Both commands carry an output template naming exactly what happened.

Areas made the gap wider. `specStructure`, the areas offer, and the two areas branches were added as lines trailing their flat counterparts (`Phase 2 in areas mode – …`), so the workflow now reads as seven phase lines where the reader expects four stages with two variants each.

## What Changes

- **Resolve the root and the inventory first.** Take the specs root from `openspec context` instead of assuming a repo-local path; list what already exists with `openspec list --specs --json`, which is what makes the anti-duplication guidance actionable.
- **Read the specs rules once** from `rules.specs` in `openspec/config.yaml` — the file the prompt already opens — before the first write. Absent rules mean no extra constraints, not an error. Rules shape the specs being written and never the workflow, and never get copied into a spec.
- **Soften the anti-duplication guardrail.** Today it reads as a merge mandate ("extend existing specs, never delete correct content"). It becomes guidance: don't create a second capability or area that covers ground an existing one already covers. Judgment, not a rule to satisfy.
- **Split the scan around the structure question.** A light pass — README, folders, manifests — proposes candidate areas and a rough scale; the structure question is judged on that plus the existing specs; the full scan at the chosen depth runs after. A Deep read of the code is paid once, under the structure it will be confirmed in.
- **Weigh the areas offer against what already exists, one direction only.** A re-run over a flat, fully derived project still raises the offer, judged on the existing specifications alone — today it never comes, because the judgment only sees newly listed capabilities. And no run ever proposes flattening grouped specs.
- **Settle the area set, then the capabilities.** The first question in areas mode is which areas to create — the proposal as options, typed areas welcome. An edited set sends the agent back to orient under it: a typed area gets its capabilities discovered from the code, not redistributed from the stale mapping. Then one multi-select per area, an empty area is dropped, and a final areas × capabilities confirmation precedes the first write; nothing confirmed anywhere stops the run.
- **Place the existing specs after the final confirmation, from wherever they sit.** Relocation covers a spec at the root and a spec already inside another area, because stage 4 groups the capabilities of the code and knows nothing about current paths — it can put `auth-ui` under `backend-shared` while the spec sits at `frontend/auth-ui`, and a root-only Place would leave stage 7 to write a fresh spec at the new path. Move, don't rewrite; leave nothing behind. A capability assigned to no area stays where it is, an emptied area directory is removed, and a partly grouped project gets its leftovers offered a home instead of being treated as settled.
- **Say that the path is the identity.** The id the CLI reports *is* the path, so assigning a capability to another area renames it, and a rename is carrying the file across — never a second spec at the new path. Renaming, splitting and merging areas then need no operation of their own: they are the confirmed picture executed as moves, and the final confirmation spells each one out as `old → new` before anything happens.
- **Never relocate a capability an active change targets, and never half-finish an area.** A delta's path is what maps it to its main spec: moving the main spec alone would leave `changes/<name>/specs/auth/spec.md` pointing at `specs/auth/spec.md`, and the next sync would recreate it there as a duplicate. A blocked capability at the root skips alone; one leaving an area stops that whole area, since half a rename strands capabilities under the old name with both areas alive. A capability that did not move is then derived where it actually is, or stage 7 recreates the duplicate the skip prevented.
- **Fold the areas variants into their stages.** Each stage carries its flat and areas paths as sub-steps instead of a trailing "in areas mode" line, so the reader sees one workflow with two paths rather than two interleaved workflows.
- **Work area by area, out loud.** In areas mode the Detail stage announces the area it is starting and how many capabilities it holds, spawns the sub-agents for that area, checks the result, and only then moves on. Progress is visible per area rather than as one silent run.
- **Bound the sub-agent fan-out by the area, and hand every one of them the boundary map.** They run alongside each other inside a group — the confirmed list in flat mode, one area in areas mode — and the group is awaited before the next begins, so the area stays the unit of progress and of checking. Since siblings write at the same time and cannot see each other, each gets the whole confirmed capability list with one-line purposes rather than only its own entry: behavior sitting between two capabilities then lands in the spec that owns it instead of in both.
- **Report the sub-agents that fail** instead of letting a capability go missing quietly — and carry on with the rest rather than abandoning the run.
- **Verify what was written, by counting it** — per area in areas mode, then once overall: open each spec and count its requirements and scenarios, each needing at least one of both. `openspec validate --specs` does not catch a sub-agent that wrote nothing, and a presence check does not catch a wrong number. Every count in the summary comes from that reading, never from a sub-agent's mid-run message or from memory — a live run reported 26 of 28 capability counts wrong while the specs themselves were sound.
- **Check the boundary map was honoured.** Handing it out makes overlap unlikely, not impossible, and the parent is the only participant that sees more than one spec. So it reads the requirement statements back — after each area, then once across the run — and looks for one behavior specified twice. The comparison is on behavior, never on subject, so two capabilities sharing a subject aren't merged away; a plainly owned behavior stays with its owner, and an unclear one leaves both requirements alone and goes to the summary. Deleting a requirement on a guess is worse than shipping a visible duplicate.
- **Add an Output On Success template** naming the root, the structure, the areas, and what was created versus updated.
- **Hand the language rule to the sub-agents, not just the language.** They write the headings and never see this prompt, so a bare `Русский` left them to invent a policy. The rule itself gained the piece it was missing: the names after `Requirement:` and `Scenario:` are prose, and a marker covers only itself. It now lives as one shared definition, rendered both into `context` by config and into every sub-agent's brief by derive — a live project had five specs of thirty-five named entirely in English with Russian bodies.

## Capabilities

### Modified Capabilities
- `prompt-style`: the spec language rule becomes one shared definition, naming the heading names as prose
- `project-config`: the spec language rule is persisted into `context` word for word, from that same definition
- `spec-derivation`: root and inventory resolution, the rules snapshot, anti-duplication as guidance, the areas offer weighed against existing specs and the relocation it implies, areas folded into the stages with per-area progress and verification, sub-agent completion, the summary

## Dependencies

This change modifies `Derivation Offers Areas Mode When Grouping Would Help` and `Areas Confirmed With The User Before Filling`, requirements introduced by `add-specs-areas-support`. That change must be synced to the main specs first, or this delta has nothing to modify.

## Impact

- `src/lib/prompt-style.ts` — `SPEC_LANGUAGE_RULE`, the one definition both prompts render
- `src/lib/config-prompt.ts` — writes that rule into `context` verbatim, between explicit copy markers
- `src/lib/derive-prompt.ts` — restructure `SPEC_DERIVE_PROMPT`; no API change, and the stages stay the same stages
- `test/derive-prompt.test.ts`, `test/prompt-style.test.ts`, `test/config-prompt.test.ts` — assertions move with the text they assert on, plus cover for the language rule and the counting
- No runtime impact: the agent gets a different brief, the plugin behaves identically

## Non-goals

- **Store selection.** `openspec.ts` fixes the root at `openspec/` with no alternates, the sidebar polls only that directory, and the init flow promises specs appearing there as they are derived. Deriving into a store would leave the sidebar empty and the setup stage unlit — out of scope until the plugin itself understands stores.
- **`--change`-scoped CLI commands.** `openspec status --json` and `openspec instructions specs --json` both require `--change`; derive has no change. Discovery goes through `openspec context` and `openspec list --specs --json`, rules through `rules.specs` in config.yaml.
- Not changing the stages themselves: Orient → Structure → Confirm → Detail → Verify, with the areas paths that `add-specs-areas-support` introduced.
- Not modifying how depth is selected (`DEPTH_QUESTION`, `DEPTH_OPTIONS`).
- Not touching `SPEC_BASELINE_PROMPT` assembly or the init-prompt embedding.
- Not moving the Guardrails section — it already sits at the end of the prompt; it only gains the entries this change introduces.
