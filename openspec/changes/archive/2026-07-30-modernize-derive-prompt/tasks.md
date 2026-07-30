## 1. Orientation before the first write

- [x] 1.1 Resolve the specs root from `openspec context` and use it for every write path, instead of the hardcoded `openspec/specs/...`
- [x] 1.2 List existing specifications with `openspec list --specs --json` before writing, and treat those ids as the only inventory — no guessing from directory names
- [x] 1.3 Read `rules.specs` from `openspec/config.yaml` once before the first write; absent or empty means no extra constraints, the text constrains specs only and never the workflow, and it never lands in a spec or the summary
- [x] 1.4 Announce the resolved root, language, structure and depth before anything is written

## 2. Stage layout in derive-prompt.ts

- [x] 2.1 Recut the stages as Orient (light) → Structure → Scan → Confirm → Detail → Verify, each carrying its flat and areas paths as sub-steps — no trailing `Phase N in areas mode – …` lines
- [x] 2.2 Split the overgrown config line: the language and `specStructure` are read with the context, each stated in its own place
- [x] 2.3 Keep `DEPTH_QUESTION` and `SPEC_BASELINE_PROMPT` untouched

## 3. Orient and Structure — the light pass and the offer

- [x] 3.1 Light pass: README, top-level folders, manifests, entry points → candidate areas and a rough scale; never a Deep read
- [x] 3.2 Judge the offer on the existing specifications plus that scale, so a re-run over a flat project that finds nothing new still raises it; state why areas help; no fixed threshold
- [x] 3.3 One direction only: offer flat → hierarchical, never the reverse; a project already grouped — by its setting or by `<area>/<capability>` ids in the inventory — gets no question at all
- [x] 3.4 On acceptance write `specStructure: hierarchical` into the `context` block
- [x] 3.5 Full scan at the chosen depth after the structure settles → the capability list, grouped under the proposed areas in areas mode
- [x] 3.6 Drop `specStructure: auto` everywhere: two values only, `flat` and `hierarchical`, and the layout on disk outranks a stale setting
- [x] 3.7 Handle the lookups failing: `openspec context` unavailable → fall back to the project's `openspec/` and say so; the inventory command failing → read `openspec/specs/` directly, kept apart from the empty-list case
- [x] 3.8 Move the annotations out of the Output On Success fence — a template in a fence gets copied verbatim, arrows and all
- [x] 3.9 Spell out what a subagent does when the spec already exists: read it first, keep what is still true, correct what the code outgrew, add what is missing

## 4. Confirm — the area set, then the capabilities

- [x] 4.1 Flat: one multi-select over the capability list, typed capabilities allowed
- [x] 4.2 Areas: first question is which areas to create — the proposed areas as options, each naming the capabilities it would hold, typed areas allowed
- [x] 4.3 When the confirmed set differs from the proposal, redo the orientation mapping under it — a typed area gets its capabilities discovered from the code — before any per-area question
- [x] 4.4 Then one question per confirmed area: multi-select over its capabilities; an area left empty is dropped
- [x] 4.5 Final confirmation shows the whole areas × capabilities picture before the first write; nothing confirmed anywhere → report and stop, no fallback to flat

## 5. Regrouping existing specs

- [x] 5.1 After the final confirmation, relocate a spec wherever it sits — root or another area — when the picture puts its capability elsewhere: move the file, leave nothing at the old path, keep the content; unassigned ones stay put
- [x] 5.2 Skip and name any capability whose delta exists under an active change — moving its main spec alone would let a later sync recreate a duplicate at the old path. `openspec/changes/` stays untouched
- [x] 5.4 State that the path is the id, so a change of area is a rename done by moving the file — never a second spec at the new path; rename, split and merge then follow from the picture with no step of their own
- [x] 5.5 Blocked at the root skips alone; blocked while leaving an area stops that whole area, since half a rename leaves both areas alive. Report either, then carry on with the rest of the picture
- [x] 5.6 A capability that did not move keeps its current path for the run, so stage 7 doesn't write the duplicate the skip avoided
- [x] 5.7 Spell the moves out in the final confirmation (`old → new`), and remove an area directory left empty
- [x] 5.3 In a partly grouped project, offer the leftover root capabilities a home among the existing areas or a new one

## 6. Detail stage — area by area, out loud

- [x] 6.1 On starting an area, name it and how many capabilities it holds, before spawning anything
- [x] 6.2 Fan sub-agents out within the group — the confirmed list in flat mode, one area in areas mode — and never have capabilities from two areas in flight at once
- [x] 6.3 Check and report the area's result before naming the next one
- [x] 6.4 Report a sub-agent that failed or wrote nothing as an underived capability instead of moving past it, and carry on with the remaining capabilities rather than abandoning them
- [x] 6.5 Wait for the whole group before moving on, so the area stays the unit of progress and of checking
- [x] 6.6 Give every sub-agent the whole confirmed capability list, by name and one-line purpose — not just its own entry — since siblings write at the same time and cannot see each other

## 7. Verify stage

- [x] 7.1 After writing, open each confirmed capability's spec and count its requirements and scenarios — per area, then once across the run; each needs at least one of both
- [x] 7.6 Every count in the summary comes from that reading, never from a sub-agent's message or memory — a sub-agent reports and then keeps editing
- [x] 7.2 Keep `openspec validate --specs`, and state that a clean validate is not evidence a capability was written
- [x] 7.3 For anything relocated this run, confirm it exists at the new path and not at the old one, so a copy-instead-of-move is caught
- [x] 7.4 Add the overlap pass: read the requirement names and SHALL statements back — this run's specs plus the inventory's neighbours — after each area and once across the run, and look for one behavior specified twice
- [x] 7.5 Judge behavior, not subject, so a shared subject isn't merged away; a plainly owned behavior stays with its owner and leaves the other, an unclear one leaves both and is reported

## 8. Guardrails and output

- [x] 8.1 Soften the anti-duplication guardrail: don't create a capability or area covering ground an existing one covers — judgment against the inventory, with correcting a wrong spec allowed and reported
- [x] 8.2 Add the Output On Success template: root, structure, areas, created vs updated, warnings — including capabilities skipped because a change holds their delta, and overlaps both resolved and unresolved
- [x] 8.3 Leave the Guardrails section where it is; it only gains this change's entries
- [x] 8.4 Add one line to the existing `0.4.0` MIGRATIONS entry for regrouping a flat project into areas — no entry of its own, one per release

## 9. Spec language reaches the pen

- [x] 9.1 Hoist the language rule into `prompt-style.ts` as one shared definition — two call sites copied by hand would drift
- [x] 9.2 Name the requirement's own name after `Requirement:` and the scenario's name after `Scenario:` as prose, and state that a marker covers only itself
- [x] 9.3 Derive hands each sub-agent the rule in full, not the language name alone — the sub-agent writes the headings and never sees the derive prompt
- [x] 9.4 Config writes it into `context` verbatim between explicit copy markers, with paraphrasing forbidden

## 10. Tests

- [x] 10.1 Move the areas assertions in `test/derive-prompt.test.ts` onto the restructured text
- [x] 10.2 Cover the new guarantees: the inventory command is referenced, `rules.specs` is read once, the per-area announcement and check exist, `--change`-only commands and store selection are absent
- [x] 10.3 Cover the regrouping and the confirm flow: the offer weighs existing specs and goes one way only, the area-set question precedes capability questions, an edited set redoes the orientation, relocation moves rather than copies, a capability with a pending delta is skipped
- [x] 10.4 Cover the fan-out: the group runs alongside itself, is awaited before the next, never spans two areas, and every sub-agent gets the boundary map
- [x] 10.5 Cover the overlap pass: both scopes are referenced, the comparison is on behavior not subject, and a requirement is never deleted on an unclear call
- [x] 10.6 Cover the counting: the verify step counts requirements and scenarios, and the summary is forbidden from quoting memory
- [x] 10.7 Cover the language rule: it names the two heading slots as prose, reaches config and derive identically, and derive passes it in full

## 11. Verify and build

- [x] 11.1 Run `bun run typecheck` to verify types
- [x] 11.2 Run `bun run build` to bundle
- [x] 11.3 Run `openspec validate modernize-derive-prompt --strict`
