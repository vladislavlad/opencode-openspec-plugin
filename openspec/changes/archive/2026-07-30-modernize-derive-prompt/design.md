## Context

`SPEC_DERIVE_PROMPT` is read next to `opsx-propose`, `opsx-sync` and `opsx-archive` — the commands `openspec init --tools opencode` writes into `.opencode/`. Those three were studied for this change. What they turned out to be worth is not their layout but the guarantees they hand the agent, so this document records what was taken, what was left, and why.

Derive differs from all three in one way that decides most of the answers: **it has no change**. It writes main specs directly. Every CLI call the standard commands make that carries `--change` is therefore unavailable.

## Goals / Non-Goals

**Goals:**
- Give derive the guarantees the standard commands give: a resolved root, a known inventory, a rules snapshot, explicit failure, verification after writing, a structured report
- Fold the areas paths that `add-specs-areas-support` introduced into the stages they belong to
- Let a project that is already flat be regrouped into areas on a re-run
- Make the area set an explicit decision of the user's, refined capability by capability
- Make progress visible per area

**Non-Goals:**
- Store support
- Moving or rewriting anything under `openspec/changes/`, including the deltas of a capability being regrouped
- Changing the stage set, the depth question, or the init-prompt embedding
- Rewriting spec.md format guidance — it is already correct

## Decisions

### 1. Taken From The Standard Commands

| Guarantee | Source | How it lands in derive |
| --- | --- | --- |
| Resolve the root from CLI output, never hardcode | sync step 2 (`planningHome.root`) | `openspec context`, because derive has no `status --change` to read |
| One authoritative source for inputs; never infer | sync step 3 ("only source… do not infer") | `openspec list --specs --json` as the inventory |
| Read rules once before the first write; absent ≠ error; rules constrain content, not workflow; never copied into output | sync step 4 | `rules.specs` from `openspec/config.yaml`, which the prompt already opens |
| Stop before writing when a precondition fails | archive step 4 | explicit stop conditions, and underived capabilities reported |
| Re-check the result after writing, not just validate | archive step 4 (post-sync comparison) | per-area and whole-run check that each capability has a requirement and a scenario |
| Delegate synchronously; never leave work in flight | archive step 4 ("do not delegate it to a background task") | wait for every sub-agent of an area before the next area |
| Announce the resolved selection | sync/archive step 1 | announce root, language, structure and depth before writing |
| An output template naming what happened | all three | Output On Success with created vs updated, grouped by area |

### 2. Deliberately Not Taken

- **Store selection.** All three carry it. Derive must not: `openspec.ts` fixes `ROOT = "openspec"` with no alternates, the sidebar polls only that directory, and `init-flow` promises the user that specs appear in the sidebar as they are derived. Deriving into a store would leave the sidebar empty and the setup stage unlit. This is a plugin limitation, not a prompt one, so it belongs in Non-goals rather than in the prompt.
- **`openspec status --json` and `openspec instructions specs --json`.** Both require `--change` and exit non-zero without one. Verified against CLI 1.7.0.
- **The delta↔main comparison.** Sync and archive verify a merge by comparing a delta against a main spec. Derive has no deltas; its equivalent is "does the capability I asked for exist and say something", which is why the verification step is shaped differently rather than copied.
- **Numbered steps as an end in itself.** The restructure is worth doing because the areas paths currently trail their stages, not because numbering is the house style. The requirement is written about the reader seeing one workflow with two paths — not about literal `a, b, c` labels, which would make every future rewording a change of its own.

### 3. Anti-Duplication Is Guidance, Not A Merge Mandate

The current guardrail reads "Merge, don't duplicate: extend existing specs, never delete correct content" — a rule with an absolute in it, and no way to satisfy it, since the prompt never says how to learn what exists.

It becomes two things. The inventory step makes it answerable, and the guardrail becomes judgment: don't create a capability or area covering ground an existing one covers. Correcting a spec that no longer matches the code stays allowed, and is reported. An absolute prohibition on deletion would otherwise freeze wrong specs in place, which is the opposite of what an idempotent refining pass is for.

### 4. Grouping Applies To What Exists, Which Means Moving Files — From Anywhere

`add-specs-areas-support` judged the areas offer on the capability list the run had just written. That silently excludes the case grouping is most wanted in: a project already derived, all flat, run again, discovering nothing new — no new capabilities, so no offer, so no way to ever group. The judgment therefore weighs the existing specs plus the scale the light pass suggests, and a re-run over a flat project still asks.

Accepting has a consequence the earlier change never had to face: the existing specs must **move**. `specs/auth/spec.md` becomes `specs/backend/auth/spec.md`. Two things follow.

Move, don't regenerate. An existing spec is what a previous pass established about the code; re-deriving it from scratch to place it would throw that away and risk a worse result. And move, don't copy — a copy leaves both ids alive, and the CLI would report two capabilities where the user asked for one. The verification step checks the old path is gone precisely because a copy is the likely failure. Relocation waits for the final areas × capabilities confirmation — the assignment made there is what says where each spec goes.

**A capability an active change targets must not move.** This is the sharp edge. A delta's path is what maps it to its main spec — `findSpecUpdates` builds the target as `mainSpecsDir + id.split('/') + spec.md`. Move `specs/auth/spec.md` to `specs/backend/auth/` while `changes/x/specs/auth/spec.md` still exists, and the next sync finds no main spec at `specs/auth/`, so it **creates one** — resurrecting the duplicate the move was meant to remove, and splitting the capability in two.

Derive could fix that by moving the delta too, but the guardrails forbid touching `openspec/changes/`, and rightly: a change's deltas are the user's in-flight work. So those capabilities are skipped and named, leaving the user to sync or archive the change first. Skipping is recoverable; a split capability is not.

**Relocation cannot stop at the root.** The first draft of Place only reached specs sitting at the root, on the reading that grouping means a flat project adopting a taxonomy. That left a hole rather than a limitation, because stage 4 groups the capabilities of the *code* and knows nothing about where their specs currently live: it can put `auth-ui` under `backend-shared` while the spec sits at `frontend/auth-ui`. Place would then do nothing, and stage 7 would write a fresh spec at the new path — the duplicate, arrived at by the prompt working normally, with nobody having made a mistake.

So Place reaches a spec wherever it is. The prompt also states the fact that makes this the only correct execution: the id the CLI reports *is* the path, so assigning a capability to another area renames it, and a rename is carrying the file. Renaming, splitting and merging areas then need no operation of their own — they are the confirmed picture executed as moves. Nothing in the prompt says "rename"; the picture already expresses it.

Two constraints come with the wider scope, and both are about not leaving a worse state than either endpoint:

- **The root tolerates a partial result; an area does not.** A blocked capability at the root just stays there while its neighbours move — "not in an area" is not a thing that can be half-empty. A blocked capability leaving an area stops the whole area, because half a rename puts some capabilities under the new name, strands the rest under the old, and leaves both areas alive in the sidebar.
- **A capability that did not move must be derived where it is.** Otherwise stage 7 writes at the picture's path and recreates precisely the duplicate the skip existed to prevent. This one is easy to miss: the caution in Place is undone two stages later unless the deferred destination is dropped for the run.

What stays out is discoverability. Nothing tells a user that typing a new area name in 5b renames an area — the capability is real but invisible, which is a fair argument for eventually giving areas explicit actions in the sidebar, where a rename is a directory move with no judgment in it.

### 5. The Structure Question Splits The Scan

Deciding structure after a full scan wastes the scan: grouping changes how Detail is organized, and on "Deep" the full pass is the expensive step. So orientation happens twice at very different prices. The light pass — README, top-level folders, manifests — exists only to propose candidate areas and a rough scale; the structure question sits on that plus the existing specs; the full pass runs once, already knowing the structure it will be confirmed in. On "Overview" the two passes look alike and the split costs nothing; it is kept anyway so there is one workflow shape, not one per depth.

### 6. The Area Set Is Settled Explicitly, Then Refined Per Area

Two earlier drafts hid the editing of the area set inside other mechanics — first one multi-select over areas, then implicitly through empty selections. Both made "add an area" and "drop an area" side effects of something else. It is now the first question of Confirm, in so many words: which areas do we create. The proposal is the options; typed areas are welcome.

An edited set invalidates the mapping the proposal was built on, so the agent orients again under the confirmed set — a typed area's capabilities are discovered from the code, not redistributed from the stale list. Only then come the per-area questions, one small multi-select each, which is what lets a single capability be excluded without dropping its whole area. An area left empty is dropped. The final confirmation shows the whole areas × capabilities picture before the first write — and is also the point where relocating existing specs gets its go-ahead.

### 7. Areas Progress Is Reported, Not Just Performed

`add-specs-areas-support` established that areas are filled one at a time so the agent never holds more than one area's capabilities. That is about context. This change adds the other half: the user watching a long derive should see which area is being worked on and how many capabilities it holds, and see it checked before the next one starts.

The two together make the loop legible: name the area and its size → spawn → wait → check → report → next. Without the announcement a multi-area derive is a long silence; without the per-area check a failure surfaces only at the end, after several more areas have run.

### 8. Sub-Agents Fan Out Within An Area, Never Across Two

Sub-agents run alongside each other inside a group — the confirmed list in flat mode, one area in areas mode — and derivation waits for the group before starting the next. Sequencing them one by one was tried and dropped: an area of a dozen capabilities turns a few minutes of wall-clock into a long serial crawl, and the concerns that argued for sequencing are answerable without it.

- **Context.** Each sub-agent still reads only its own capability, and the parent still collects results one group at a time. The area, not the capability, is the unit that bounds what is in flight — which is what the staging was for.
- **Failure cost.** A failure inside a group is reported and the rest of the group finishes; the areas still to come are unaffected. Nothing is abandoned, and nothing waits on a retry.
- **Duplication.** This is the one thing parallelism genuinely takes away: a sub-agent cannot be told what its siblings just wrote, because they are writing at the same time. The answer is in two halves, before and after. Before: every sub-agent gets the whole confirmed capability list — each name with its one-line purpose — rather than only its own entry, a map of boundaries handed to all of them at once instead of a running log handed to the last ones. It also serves them evenly, where sequencing left the first sub-agent knowing nothing about anyone. After: the parent reads the specs back and checks the map was honoured (decision 9).

The area boundary is what makes the per-area announcement and the per-area check in decision 7 meaningful — a group that spanned two areas could not be reported or verified as one.

### 9. The Boundary Map Is Checked, Not Just Handed Out

Giving the sub-agents a map of boundaries makes overlap unlikely; it does not make it impossible. Nothing in the run would otherwise notice, because the only participant that sees more than one spec is the parent, and until now it only counted files. So it reads the requirement names and SHALL statements back — after each area, and once across the run — and looks for one behavior specified twice.

Two things decide whether this helps or hurts.

**Behavior, not subject.** Over-merging is the real risk. A frontend capability and an auth capability may both mention tokens; only one should say who refreshes them. Comparing subjects would flag that pair and delete a legitimate requirement. So the test is the SHALL statement with its trigger and outcome.

**A doubtful call leaves both.** Where one capability's purpose plainly owns the behavior, it keeps it and the other drops it. Where ownership is unclear, both stay and the summary says so. Deleting a requirement on a guess is worse than shipping a duplicate: the duplicate is visible in the sidebar and fixable next run, the deletion is silent.

**Counts come from the files, not from the conversation.** The same principle the overlap pass rests on — the parent must look, not recall — applies to the numbers in the summary, and a live run showed why. Twenty-six of twenty-eight capability lines carried a wrong count: scenarios systematically low (20 against 26, 24 against 32, 19 against 27), requirements adrift in both directions (8 against 6, 8 against 9, 12 against 13). The specs themselves were fine — 225 requirements, 608 scenarios, all validating. Only the report lied, because the numbers came from what sub-agents said mid-run rather than from the finished files: a sub-agent reports, then keeps editing. The presence check passed throughout, which is exactly its limit — it asked whether a file had *a* requirement, never how many. So the verification step counts, and the summary may only quote that count.

Scope is per area first, then whole-run. The per-area pass is cheap — one area's specs are already the only thing in context — and catches most of it early. The whole-run pass exists because no per-area check spans two areas, and behavior straddling two areas is exactly what nobody was positioned to see.

## Risks / Trade-offs

- **Relocation is the riskiest thing derive does.** Every other step writes or extends; this one moves files the user may be reading in the sidebar. Mitigations are in the decisions above: move rather than regenerate, verify the old path is gone, and never touch a capability a change depends on. The sidebar itself tolerates it — a selected spec that vanishes falls back to the list on the next poll.
- **Prompt length.** Every guarantee is more text for a small model to hold. Mitigation: the guarantees replace vaguer wording rather than stacking on it, and the areas variants stop being duplicated prose.
- **`openspec context` output shape.** Its human-readable form was verified; if a future CLI changes it, the root resolution degrades to the current hardcoded path. The prompt should not treat an unparsable answer as fatal.
- **Verification cost.** Re-reading what was written costs reads at the end of a long run. Cheap next to the sub-agent passes it guards.
- **No enforcement.** These are prompt-level contracts. Nothing in the plugin checks that the agent honoured them — the same footing as every other guardrail in this file.

## Migration Plan

Prompt text only: no stored state of its own, nothing to migrate. But regrouping is not invisible — after a re-run, specs the user had at the root appear inside areas in the sidebar, and that is something they can now do that they could not before. So the `0.4.0` MIGRATIONS entry that `add-specs-areas-support` introduces gains one line for it, rather than this change adding an entry of its own: one entry per release, per the house rule in `migrations.ts`.
