## Purpose
Derivation prompt: reverse-engineering specifications from existing code. Defines what counts as a capability, how project exploration depth is chosen, how work is distributed to sub-agents, and what derivation is allowed to edit. Triggered by command `/opsx-baseline` and by a step within initialization prompt.

## Requirements

### Requirement: Derivation Prompt Asks Project Exploration Depth
Derivation prompt SHALL ask user for code exploration depth — "Overview" or "Deep" — before starting to read project, warning about deep mode cost. The question SHALL be asked by the caller, while derivation body merely follows chosen depth without its own branching. Chosen depth SHALL determine both overview pass that assembles capability list and sub-agent work at detail stage.

#### Scenario: Question Asked Before Reading Code
- **WHEN** derivation is launched by command `/opsx-baseline`
- **THEN** first a separate question about depth with options "Overview" and "Deep" is asked, and only after answer does project overview begin

#### Scenario: In Init Depth Is Asked Along With Derivation Consent
- **WHEN** initialization prompt reaches derivation step
- **THEN** one `question` call offers "Yes – Overview", "Yes – Deep" and "No", and no separate depth question exists in prompt

#### Scenario: Derivation Body Doesn't Branch
- **WHEN** any prompt including derivation is assembled
- **THEN** common derivation part is the same and contains no conditional wording like "already answered above" — only the question asked by caller differs

#### Scenario: "Deep" Doesn't Mean "Open Every File"
- **WHEN** user selected "Deep"
- **THEN** prompt states that real execution paths are read, while tests, fixtures, generated and vendored code are skipped at any depth

#### Scenario: Cost Warning
- **WHEN** user is shown "Deep" option
- **THEN** its description states such analysis may take significant time and tokens

#### Scenario: High-Level Analysis
- **WHEN** "Overview" is selected
- **THEN** capability list is assembled from README, folder structure, manifests and entry points, and sub-agent reads entry points and main capability modules without reading all their files

#### Scenario: Deep Analysis
- **WHEN** "Deep" is selected
- **THEN** capability list is assembled after reading code for each area, not by folder layout, and sub-agent walks through capability execution paths from start to finish, including error handling and edge cases, recording them as separate scenarios

### Requirement: Derivation Searches For Capabilities In Any Kind Of Project
Derivation prompt SHALL name what exactly counts as a capability: what project provides its user, integrations and external systems it depends on, and behavior it implements itself rather than taking from a library. Prompt SHALL explicitly state that project doesn't have to be an application: in infrastructure, configuration or tooling repository, the described behavior is the declared configuration itself.

#### Scenario: What To Search Is Named Explicitly
- **WHEN** derivation prompt is assembled
- **THEN** it lists all three capability kinds without illustrative examples and doesn't restate stack and architecture — they're already described in `openspec/config.yaml` and AGENTS.md

#### Scenario: Repository Without Application Code
- **WHEN** project consists of configurations, manifests or scripts and contains no application code
- **THEN** prompt instructs to describe declared configuration as behavior: what it deploys, how parts are connected, what the launcher gets

### Requirement: Derivation Doesn't Set Sub-Agent Type Itself
Derivation prompt SHALL require taking sub-agent type from list that Task tool itself offers, and SHALL prohibit inventing a type name. If suitable agent doesn't exist or tool is unavailable, prompt SHALL instruct to analyze capabilities sequentially on its own, without retry attempts with guessed type.

#### Scenario: Agent Type Taken From Tool
- **WHEN** derivation prompt is assembled
- **THEN** it contains no specific agent type name and instructs to select a general type from the tool's own list

#### Scenario: No Suitable Agent
- **WHEN** Task tool is unavailable or doesn't offer a general agent
- **THEN** agent analyzes capabilities one by one itself and doesn't attempt to call Task with guessed type

### Requirement: Derivation Exits Without Questions Only On Truly Empty Project
Derivation prompt SHALL instruct on overview pass to exit remaining phases only when directory is empty or contains nothing besides README: confirming an empty capability list isn't necessary. Exit condition SHALL be worded so that a repository of configurations, manifests or scripts doesn't fall under it.

#### Scenario: Directory Is Empty
- **WHEN** project has nothing except README, or is empty
- **THEN** agent reports this and skips confirmation, detail and validation phases without asking about empty list

#### Scenario: Project Without Application Code Isn't Considered Empty
- **WHEN** project consists of configurations, manifests or scripts
- **THEN** exit doesn't trigger: agent assembles capability list from them and goes through all phases

### Requirement: Derivation Prompt Limits config.yaml Editing
Derivation prompt restrictions SHALL allow editing `openspec/config.yaml` where the prompt itself explicitly asks for it — otherwise checkpoint `plugin.init.done` contradicts write prohibition beyond `openspec/specs/`.

#### Scenario: Stage Checkpoint Doesn't Violate Restrictions
- **WHEN** initialization prompt asks to write `plugin.init.done` right after derivation block
- **THEN** derivation restrictions explicitly allow such edit, keeping prohibition on `openspec/changes/` and code

### Requirement: Derivation Reads The Spec Structure Setting
Derivation prompt SHALL read `specStructure` from `openspec/config.yaml` together with the rest of the context, before reading any code, and follow it. The value is `flat` or `hierarchical`; a missing value SHALL be read as `flat`. Where the setting and the layout on disk disagree, the layout wins — a project whose specifications are already grouped is in areas mode whatever the setting says.

#### Scenario: Flat Or Missing
- **WHEN** `specStructure` is `flat` or absent and no specification is grouped
- **THEN** derivation runs the existing capability workflow and writes `specs/<capability>/spec.md`

#### Scenario: Hierarchical
- **WHEN** `specStructure` is `hierarchical`
- **THEN** derivation runs areas mode

#### Scenario: Layout Outranks A Stale Setting
- **WHEN** the setting reads `flat` but specifications already sit inside areas
- **THEN** derivation treats the project as hierarchical rather than writing flat specs beside the existing areas

### Requirement: Derivation Offers Areas Mode When Grouping Would Help
Derivation prompt SHALL let the agent offer a switch to areas mode after the light orientation pass, when the project is not already grouped and the picture in hand — the specifications that already exist plus the scale the orientation suggests — is large enough that grouping would help. The offer SHALL go one way only, flat to hierarchical: no run ever proposes flattening grouped specs, and no run offers grouping to a project already grouped — whether by its setting or by the ids in its inventory. It SHALL be a judgment made from that picture, not a fixed capability count, and SHALL state why areas help. Declining SHALL leave the run flat and the setting on disk untouched, so a later run may ask again. Accepting SHALL write `specStructure: hierarchical` into the `context` block and continue in areas mode, proposing areas derived from the existing capabilities and the code — not from the new capabilities alone.

#### Scenario: Offer Before The Full Scan
- **WHEN** the light orientation suggests a scale where one flat list would be unwieldy, and the project is not already grouped
- **THEN** the agent asks whether to split by areas before the full scan runs

#### Scenario: Re-Run Over An Already Flat Project
- **WHEN** derivation runs again on a project whose specifications are all flat, and finds nothing it has not already covered
- **THEN** the offer is still raised, judged on the existing specifications alone

#### Scenario: One Direction Only
- **WHEN** the setting is already `hierarchical`, or the inventory already holds `<area>/<capability>` ids
- **THEN** no structure question is asked — and no run, whatever the setting, offers to flatten grouped specs

#### Scenario: No Offer For A Small Project
- **WHEN** the combined picture is small
- **THEN** derivation proceeds flat and does not raise the question

#### Scenario: Declined Offer
- **WHEN** the user declines the switch
- **THEN** derivation continues flat, `specStructure` is left as it was, and a later run may offer again


### Requirement: Areas Confirmed With The User Before Filling
In areas mode, derivation prompt SHALL settle the area set before any capability is chosen. The first question SHALL be which areas to create: a multi-select over the proposed areas, each shown with the capabilities it would hold, with areas of the user's own typed in as well. When the confirmed set differs from the proposal, derivation SHALL redo the orientation mapping under the confirmed set — discovering capabilities for a typed area rather than guessing from the old mapping — before asking anything further. Then it SHALL ask one question per confirmed area, a multi-select over that area's capabilities, and show the resulting areas × capabilities picture for one final confirmation before the first write. An area whose question ends with nothing selected SHALL be dropped; when nothing is confirmed anywhere, derivation SHALL report there is nothing to derive and stop rather than fall back to a flat run.

#### Scenario: Area Set Settled First
- **WHEN** areas mode reaches confirmation
- **THEN** the first question is which areas to create, and no capability question precedes it

#### Scenario: Edited Set Redoes The Orientation
- **WHEN** the user drops a proposed area or types one the proposal lacked
- **THEN** the capability mapping is redone under the confirmed set before the per-area questions are shown

#### Scenario: Typed Area Gets Real Capabilities
- **WHEN** the user adds an area the agent had not proposed
- **THEN** its capabilities come from looking at the code again, not from redistributing the stale list

#### Scenario: One Question Per Area
- **WHEN** the area set is settled
- **THEN** each confirmed area gets its own multi-select question over its capabilities

#### Scenario: Empty Area Dropped
- **WHEN** an area's question ends with nothing selected
- **THEN** that area is dropped and does not reach the Detail stage

#### Scenario: Final Picture Confirmed
- **WHEN** the per-area questions are done
- **THEN** the user sees the whole areas × capabilities selection and confirms it before anything is written

#### Scenario: Nothing Confirmed Anywhere
- **WHEN** no area survives confirmation
- **THEN** derivation reports there is nothing to derive and stops

### Requirement: Derivation Writes Exactly One Area Level
Derivation prompt SHALL write hierarchical specs as `openspec/specs/<area>/<capability>/spec.md` and SHALL NOT create areas inside areas, whatever depth the project's own directories suggest.

#### Scenario: One Level Written
- **WHEN** derivation writes a spec in areas mode
- **THEN** the path holds exactly one area segment between `specs/` and the capability directory

#### Scenario: Deep Structure Not Reproduced
- **WHEN** the project's source tree is nested several levels deep
- **THEN** areas stay one level and the nesting is reflected in area naming, not in extra directories

### Requirement: Derivation Places Specs Where The Confirmed Picture Puts Them
Derivation SHALL relocate an existing specification whenever the confirmed picture puts its capability somewhere other than where the file sits — from the root into an area, or from one area into another — moving the file and leaving nothing at the old path, and only after the final areas × capabilities confirmation. It SHALL move rather than rewrite the capability from scratch: an existing spec's content is what the previous pass established. A capability the picture leaves out of every area SHALL stay where it is, and an area left with no capabilities and no sub-areas SHALL have its empty directory removed.

#### Scenario: Root Spec Moved Into An Area
- **WHEN** the capability `auth` sits at the root and the picture assigns it to `backend`
- **THEN** its spec lives at `openspec/specs/backend/auth/spec.md` and `openspec/specs/auth/spec.md` no longer exists

#### Scenario: Spec Moved Between Areas
- **WHEN** `frontend/auth-ui` exists and the picture assigns that capability to `backend-shared`
- **THEN** its spec is carried to `openspec/specs/backend-shared/auth-ui/spec.md` and nothing remains under `frontend`

#### Scenario: Relocation Waits For The Final Confirmation
- **WHEN** the user has accepted the switch but not yet confirmed the areas × capabilities picture
- **THEN** nothing has moved yet

#### Scenario: Content Preserved On The Move
- **WHEN** an existing spec is relocated
- **THEN** its requirements and scenarios travel with it unchanged, save for whatever this run deliberately refines

#### Scenario: Unassigned Capability Stays Flat
- **WHEN** the picture leaves a capability out of every area
- **THEN** it remains at the root, alongside the areas

#### Scenario: Emptied Area Directory Removed
- **WHEN** every capability of an area has moved out and it holds no sub-areas
- **THEN** its directory is removed rather than left behind empty

### Requirement: A Capability's Path Is Its Identity
Derivation prompt SHALL state that a capability's path from `specs/` is the id the CLI reports, so assigning a capability to a different area renames it, and a rename is performed by carrying the file across — never by writing a second specification at the new path. Rearranging areas SHALL therefore need no operation of its own: renaming, splitting and merging areas SHALL all follow from the confirmed picture being executed as moves.

#### Scenario: New Path Never Gets A Fresh Spec
- **WHEN** a capability that already has a spec is assigned to a different area
- **THEN** the existing file is moved there, and no second spec is written at the new path while the old one survives

#### Scenario: Renaming An Area Follows From The Picture
- **WHEN** every capability of `backend` is confirmed under the name `backend-core`
- **THEN** their specs move there, `backend` is left empty and removed, and the area has been renamed without a rename step existing

#### Scenario: Splitting An Area Follows From The Picture
- **WHEN** the capabilities of one existing area are confirmed under two area names
- **THEN** each spec moves to the name it was confirmed under, and the area has been split

#### Scenario: Merging Areas Follows From The Picture
- **WHEN** the capabilities of two existing areas are confirmed under a single name
- **THEN** every spec moves there, both source areas are emptied and removed, and the areas have been merged

#### Scenario: Moves Are Shown Before They Are Agreed To
- **WHEN** the final picture is presented and some capabilities would change path
- **THEN** each of those is spelled out as a move from its current path to its new one, since the picture otherwise shows only destinations

### Requirement: Derivation Does Not Relocate A Spec An Active Change Targets
Derivation SHALL NOT relocate a capability whose delta exists under an active change, because the delta's path is what maps it to its main spec: moving the main spec alone would leave the change pointing at the old location, where a later sync would recreate a duplicate. A blocked capability at the root SHALL stay at the root while the others still move — the root cannot be left half-empty. A blocked capability leaving an area SHALL stop that whole area: none of its capabilities move and the area is left as it is, because a half-finished rename leaves some capabilities under the new name, the rest stranded under the old, and both areas alive. Derivation SHALL report every capability skipped this way with the change holding its delta, SHALL keep a capability that did not move at its current path for the rest of the run, and SHALL leave `openspec/changes/` untouched as always.

#### Scenario: Blocked Root Capability Skipped Alone
- **WHEN** `openspec/changes/<name>/specs/auth/spec.md` exists and `auth` was assigned to an area
- **THEN** `auth` stays at the root, the other root capabilities still move, and the summary names it with its change

#### Scenario: Blocked Capability Stops Its Whole Area
- **WHEN** one capability of `backend` has a delta under an active change and the picture moves all of `backend` elsewhere
- **THEN** none of `backend`'s capabilities move, `backend` is left as it is, and the summary says why

#### Scenario: Rest Of The Picture Still Proceeds
- **WHEN** one area is left alone because a delta blocks it
- **THEN** the other areas of the confirmed picture are still carried out

#### Scenario: A Skipped Capability Is Derived Where It Actually Is
- **WHEN** a capability did not move and the Detail stage reaches it
- **THEN** its spec is written at its current path, not at the path the picture wanted, so the skip does not produce the duplicate it was avoiding

#### Scenario: Changes Directory Untouched
- **WHEN** derivation relocates specs
- **THEN** nothing under `openspec/changes/` is moved, rewritten or deleted

### Requirement: Derivation Completes A Partly Grouped Project
In areas mode, when specifications still sit at the root beside existing areas, derivation SHALL offer to place them — into an existing area or a new one — instead of treating the layout as settled. Declining SHALL leave them at the root.

#### Scenario: Leftover Flat Specs Offered A Home
- **WHEN** the project is hierarchical and some capabilities remain at the root
- **THEN** derivation offers to place them, listing the existing areas as options alongside new ones

#### Scenario: Fully Grouped Project Asks Nothing
- **WHEN** every capability already sits inside an area
- **THEN** no placement question is asked

### Requirement: Derivation Scans In Two Passes Around The Structure Question
Derivation prompt SHALL orient in two passes. A light pass — README, top-level folders, manifests, entry points — SHALL propose candidate areas and a rough scale, and feed the structure question. The full pass at the chosen depth SHALL run only after the structure is settled, and SHALL produce the capability list — grouped under the proposed areas in areas mode. The expensive read of the code therefore happens once, under the structure it will be confirmed in.

#### Scenario: Light Pass Feeds The Structure Question
- **WHEN** the structure question is judged
- **THEN** it draws on the light pass and the existing specifications — the full capability list does not exist yet

#### Scenario: Full Scan Runs Under The Settled Structure
- **WHEN** the structure is settled
- **THEN** the full pass at the chosen depth produces the capability list, grouped by the proposed areas in areas mode

#### Scenario: Deep Is Paid Once
- **WHEN** the chosen depth is "Deep"
- **THEN** the code is read at that depth in the full pass only — the light pass never reads at Deep

### Requirement: Derivation Resolves Its Root And Its Existing Specs From The CLI
Derivation prompt SHALL take the specs root from `openspec context` rather than assuming a repository-local path, and SHALL list the specifications that already exist with `openspec list --specs --json` before writing anything. The listed ids SHALL be the only source for what is already covered — derivation SHALL NOT infer that from directory names or from memory of an earlier run.

#### Scenario: Root Comes From The CLI
- **WHEN** derivation is about to write its first spec
- **THEN** the path it writes to is built from the root the CLI reported, not from a hardcoded `openspec/` prefix

#### Scenario: Inventory Read Before Writing
- **WHEN** derivation reaches the point of writing specs
- **THEN** it has already listed the existing specifications, and knows their ids

#### Scenario: Empty Inventory Is Normal
- **WHEN** the project has no specifications yet
- **THEN** the empty listing is treated as "nothing exists", not as a failure

### Requirement: Derivation Reads The Specs Rules Once Before Writing
Derivation prompt SHALL read `rules.specs` from `openspec/config.yaml` once, before the first spec is written, and apply it to every spec produced in that run. An absent or empty `rules.specs` SHALL mean no additional constraints rather than an error. The rules SHALL constrain the content and form of the specs only — never the workflow, the resolved root or the CLI calls — and SHALL NOT be copied into any spec file or summary.

#### Scenario: Rules Read Before The First Write
- **WHEN** derivation is about to write its first spec file
- **THEN** it has read `rules.specs` once and reuses that reading for every capability in the run

#### Scenario: Missing Rules Are Not An Error
- **WHEN** `openspec/config.yaml` has no `rules.specs` block, or it is empty
- **THEN** derivation continues normally

#### Scenario: Rules Are Not Workflow Instructions
- **WHEN** `rules.specs` contains text that reads like an instruction about how to run derivation
- **THEN** it is applied to the specs being written and does not change the steps, the root or the commands

#### Scenario: Rules Text Stays Out Of Output
- **WHEN** a spec or the final summary is written
- **THEN** the rule text does not appear in it verbatim

### Requirement: Derivation Avoids Duplicating What Already Exists
Derivation prompt SHALL instruct the agent not to create a capability or an area that covers ground an existing one already covers, and to extend the existing one instead. This SHALL be phrased as judgment exercised against the inventory, not as a rule that forbids restructuring: where an existing spec is genuinely wrong or superseded, the agent may correct it and SHALL say so in the summary.

#### Scenario: Existing Capability Extended
- **WHEN** a capability the agent identified matches one in the inventory
- **THEN** its spec is extended rather than written a second time under another name

#### Scenario: Existing Area Reused
- **WHEN** the areas the agent proposes overlap an area that already exists
- **THEN** the existing area is reused rather than a near-duplicate created beside it

#### Scenario: Correction Is Allowed And Reported
- **WHEN** an existing spec no longer matches the code
- **THEN** the agent may correct it, and the summary names what it changed

### Requirement: Derivation Folds The Areas Paths Into Its Stages
Derivation prompt SHALL present each stage with its flat and its areas path as sub-steps of that stage, rather than as separate instructions trailing after the flat one. A reader SHALL see one workflow with two paths through it.

#### Scenario: Stage Carries Both Paths
- **WHEN** a stage behaves differently in areas mode
- **THEN** both behaviours appear as sub-steps under that stage's heading

#### Scenario: No Trailing Mode Instructions
- **WHEN** the prompt is assembled
- **THEN** it contains no instruction whose only anchor is a phrase like "in areas mode" appended after an unrelated step

### Requirement: Derivation Works One Area At A Time With Visible Progress
In areas mode, the Detail stage SHALL process one area at a time and SHALL report its progress as it goes: on starting an area it names the area and how many capabilities it holds, then fans out that area's sub-agents, then checks that area's result before naming the next one. Derivation SHALL NOT begin an area before the previous one has been checked and reported.

#### Scenario: Area Announced Before Its Sub-Agents
- **WHEN** derivation starts an area
- **THEN** it says which area it is working on and how many capabilities that area holds, before spawning anything

#### Scenario: Area Checked Before The Next One
- **WHEN** an area's sub-agents have finished
- **THEN** that area's specs are checked and reported, and only then does the next area begin

#### Scenario: One Area In Play
- **WHEN** several areas are confirmed
- **THEN** only the current area's capabilities are ever being worked on

### Requirement: Derivation Fans Sub-Agents Out Within A Group And Waits For It
The Detail stage SHALL spawn a sub-agent per capability and let them run alongside each other, bounded by the group: the confirmed capability list in flat mode, one area in areas mode. Capabilities from two areas SHALL NOT be in flight at once, and derivation SHALL wait for the whole group before moving on. Every sub-agent SHALL receive the whole confirmed capability list — each name with its one-line purpose, not their spec contents — and not only its own entry, since sub-agents cannot see each other and that list is what marks where one capability ends and its neighbour begins. A sub-agent that failed or wrote nothing SHALL be reported as an underived capability and SHALL NOT stop the rest of the group or the areas still to come.

#### Scenario: Group Runs In Parallel
- **WHEN** several capabilities are confirmed in the same group
- **THEN** their sub-agents run alongside each other rather than one after another

#### Scenario: Group Is Awaited Before The Next
- **WHEN** a group's sub-agents are in flight
- **THEN** derivation waits for all of them before starting the next group

#### Scenario: The Group Never Spans Two Areas
- **WHEN** several areas are confirmed
- **THEN** the sub-agents in flight at any moment all belong to the same area

#### Scenario: Every Sub-Agent Gets The Boundary Map
- **WHEN** a sub-agent is spawned
- **THEN** it is given every confirmed capability's name and one-line purpose, so behavior sitting on a boundary lands in the spec that owns it rather than in two

#### Scenario: Failure Named
- **WHEN** a sub-agent fails or produces no spec
- **THEN** its capability is reported as underived, with what is known about why

#### Scenario: One Failure Does Not Abandon The Rest
- **WHEN** a sub-agent in a group fails
- **THEN** the rest of the group and the areas still to come are carried out, and the failed capability is reported at the end

#### Scenario: No Silent Skip
- **WHEN** the run reaches its summary
- **THEN** every confirmed capability is accounted for as either derived or underived

### Requirement: Derivation Verifies What It Wrote
Derivation prompt SHALL open each confirmed capability's spec after writing and count its requirements and its scenarios — per area in areas mode, and once across the run — in addition to running `openspec validate --specs`. Each capability needs at least one of both, and a capability that passes validation only because nothing was written for it SHALL be reported, not counted as done. Every count that reaches the summary SHALL come from that reading of the files, never from what a sub-agent reported or what the agent remembers: a sub-agent's message predates its last edit, and carried counts drift.

#### Scenario: Empty Result Caught
- **WHEN** a confirmed capability ended with no spec file, or one with no requirement
- **THEN** derivation reports it instead of treating a clean `openspec validate --specs` as success

#### Scenario: Counts Come From The Files
- **WHEN** the summary states how many requirements and scenarios a capability has
- **THEN** those numbers were counted from the spec on disk after the last write, not taken from a sub-agent's report or from memory

#### Scenario: A Sub-Agent's Own Tally Is Not Authoritative
- **WHEN** a sub-agent reports a count and then keeps editing its spec
- **THEN** the summary carries the count from the finished file, not the one the sub-agent named

#### Scenario: A Relocated Spec Left No Copy Behind
- **WHEN** capabilities were relocated into areas during this run
- **THEN** the check confirms each one exists at its new path and no longer at the old one, so a copy-instead-of-move is caught rather than shipped as a duplicate

#### Scenario: Verification Is Not Only Validation
- **WHEN** derivation finishes
- **THEN** it has both run `openspec validate --specs` and checked the confirmed capabilities against what is on disk

### Requirement: Sub-Agents Receive The Language Rule, Not Only The Language
Derivation prompt SHALL hand each sub-agent the spec language together with the full language rule, copied out rather than referenced, because the sub-agent writes the headings and never sees the derivation prompt. The rule SHALL name the requirement's own name after `Requirement:` and the scenario's name after `Scenario:` as prose to be written in the spec language, and SHALL state that a marker covers only itself — so a heading is never left in the wrong language because the marker in front of it is English.

#### Scenario: Rule Travels With The Language
- **WHEN** a sub-agent is spawned to write a spec
- **THEN** it receives the language rule in full, not just the name of the language

#### Scenario: Requirement And Scenario Names Are Prose
- **WHEN** a spec is written for a project whose language is not English
- **THEN** the text after `### Requirement:` and after `#### Scenario:` is in that language, alongside the requirement statement and the WHEN/THEN lines

#### Scenario: A Marker Covers Only Itself
- **WHEN** the rule lists `### Requirement:` among the markers to keep unchanged
- **THEN** it also says that the name following the marker is not part of it and gets written in the spec language

#### Scenario: Code Identifiers Still Stay As They Are
- **WHEN** a requirement refers to a class, field, enum value or API term
- **THEN** that identifier is left in its original form, since only prose is subject to the language

### Requirement: Derivation Checks For Overlap After Its Sub-Agents
Derivation SHALL read back what its sub-agents wrote and look for one behavior specified in more than one capability — after each group in areas mode, and once across the whole run. The comparison SHALL cover the specs this run touched together with the specs already beside them in the inventory, and SHALL be made on behavior — the SHALL statement with its trigger and outcome — not on subject matter: two capabilities may legitimately mention the same thing while only one specifies it. Where a behavior really is specified twice, derivation SHALL keep it in the capability whose purpose owns it, remove it from the other, and report both the overlap and the decision. Where ownership is genuinely unclear, derivation SHALL leave both in place and report it as unresolved rather than delete a requirement it cannot confirm is a duplicate.

#### Scenario: Overlap Inside A Group Caught At Its Check
- **WHEN** two capabilities of the same area come back specifying the same behavior
- **THEN** the overlap is found at that area's check, before the next area starts

#### Scenario: Overlap Across Areas Caught At The End
- **WHEN** capabilities in two different areas specify the same behavior
- **THEN** the whole-run pass finds it, since no per-area check spans two areas

#### Scenario: Specs Not Touched This Run Are Compared Too
- **WHEN** a sub-agent specifies behavior an untouched neighbouring spec already carries
- **THEN** the comparison catches it, because the inventory's specs are part of it

#### Scenario: Shared Subject Is Not An Overlap
- **WHEN** two capabilities both refer to the same thing but only one states the behavior over it
- **THEN** nothing is removed — the check is on behavior, not on subject

#### Scenario: Resolved Overlap Is Reported
- **WHEN** a behavior is specified twice and one capability's purpose plainly owns it
- **THEN** it stays there, is removed from the other, and the summary names the behavior, the keeper and the loser

#### Scenario: Unclear Ownership Is Left Alone
- **WHEN** a behavior appears twice and neither capability plainly owns it
- **THEN** both requirements stay as they are and the summary reports the overlap as unresolved

### Requirement: Derivation Reports A Structured Summary
Derivation prompt SHALL end with an Output On Success section giving the shape of the final report: the resolved root, the structure used, the areas covered when in areas mode, which specs were created and which were updated, and any warnings — underived capabilities, corrections to existing specs, anything the agent was unsure of.

#### Scenario: Summary Separates Created From Updated
- **WHEN** derivation reports its result
- **THEN** newly created specs and extended ones are listed apart, not merged into one count

#### Scenario: Areas Grouped In The Summary
- **WHEN** the run was in areas mode
- **THEN** the summary groups the specs under the areas they belong to

#### Scenario: Warnings Carried To The End
- **WHEN** anything was underived, corrected or uncertain
- **THEN** it appears in the summary rather than only in the running commentary
