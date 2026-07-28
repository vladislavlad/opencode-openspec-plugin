## Why

The init flow works, but three places in the prompts are poorly worded – this is visible on the very first live run.

1. **The agent creates what already exists.** The sidebar itself writes `openspec/config.yaml` with a marker (`writeInitMarker` → `writeLocal` creates the directory), after which the short `markerStep(true)` branch goes into the prompt. In a live run, the agent still started its turn with `mkdir -p <project>/openspec` – meaning the `markerWritten` flag came as `false` where the sidebar could write the file. This is a bug on our side, and it's fixed in the sidebar code. We don't touch the `openspec --version` check or the prompt text.

2. **Task granularity hints measure time.** The "Tasks" question in `CONFIG_PROMPT` offers "Coarse / Medium / Fine" with descriptions "~half-day tasks", "~1-2h tasks". Time estimates mean nothing: a task is executed by both a human and an agent, and their speeds differ by orders of magnitude. Plus three options are excessive choice where only two modes are really distinguishable.

3. **The derivation stage doesn't ask about depth.** The cost of baseline is entirely determined by how thoroughly sub-agents read through the code for each capability – and currently the user has no say in this. On a large repository, "read everything" costs a lot of time and tokens, and the person should decide that themselves before the stage even starts.

## What Changes

- The reason why the agent ran `mkdir` in a live run is fixed: the `markerWritten` flag must be `true` everywhere the sidebar actually wrote the marker. Only the sidebar code is changed – the init prompt is not modified for this point
- The "Tasks" question in `CONFIG_PROMPT` becomes binary: "High-level" (a few high-level tasks) and "Detailed" (sub-tasks grouped under high-level sections). The "Coarse", "Medium", "Fine" options and any time estimates are removed; the rules in `rules.tasks` are written for two options
- The derivation prompt explicitly states that specs describe both sides of a project: capabilities for the user and technical solutions that deliver them
- The derivation prompt asks about code exploration depth – "Overview" or "Deep" – and warns that deep mode takes significantly more time and tokens. The question is asked before the agent has read anything at all: gathering a list of capabilities is already code exploration, and depth determines whether we look at folder layout or read through each area. The chosen depth determines both the overview pass and the sub-agent's detail work. "Deep" is explicitly stated as "actual execution paths", not "open every file". In init, the question merges with the "derive now?" gate ("Yes – Overview" / "Yes – Deep" / "No") so the user answers once; `/opsx-baseline` asks separately

Following prompt review, the same change also absorbed edits that shouldn't sit alongside a reworked flow:

- The final init section no longer leaves a marker on an empty project: the condition "once validation passes" was undefined when there's nothing to validate. Along with this, the repeated `openspec validate --specs` run right after phase 4 of derivation is gone
- Derivation constraints ("write only under `openspec/specs/`") no longer contradict the adjacent instruction to write `plugin.init.done` into config.yaml
- The `/opsx-baseline` description no longer promises a setup that the prompt doesn't perform – in both the palette and the README
- The YAML example in step 6 of `CONFIG_PROMPT` is replaced with a prose file description: the example silently suggested dropping `rules.specs` / `rules.design`, which the same prompt tells you to keep
- The update prompt creates `openspec/config.yaml` if it doesn't exist yet
- The final section no longer branches on "empty project / not empty": without the marker, it talks about the same thing – the **Explore** and **Propose** buttons in the sidebar and their equivalent commands `/opsx-explore` and `/opsx-propose`
- The final greeting mentions `/opsx-baseline`: derivation is a judgment on the codebase, the first pass may miss something, and a re-run by its own constraints refines and expands rather than duplicates
- The instruction about the marker's fate sits at the stop itself: the installation step when `openspec init` fails directly tells you to leave config.yaml for Resume – earlier this was only explained in the final section, which a small model can't reach from a stop. The invitation to work sounds only after the marker is removed and starts with a message that OpenSpec is configured
- The derivation overview pass got an exit for empty projects – previously the confirmation phase had to show a multi-select from an empty list. The exit condition is narrow: only an empty directory or a single README, because on a live run a repository of docker-compose was read as "no application code" and derivation collapsed
- Multi-select became an instruction instead of a parenthetical remark: on a live run the 27b model rendered the capability list as a single select and rephrased the question to "what additional capabilities to add". Now both the confirmation phase and "Stack"/"Context" in settings directly require multi-select enabled, and the question asks about already found capabilities
- The detail phase no longer names the sub-agent type: `subagent_type "general-purpose"` is a Claude Code name; opencode rejects it ("Unknown agent type"), after which the model starts guessing the call form. Now the type comes from the tool's own list, and when no suitable agent exists, work proceeds sequentially without retry attempts
- Derivation explicitly states that a project doesn't have to be an application: in an infrastructure, configuration, or tooling repository, the described behavior is the declared configuration itself
- The final section assembles for enabled stages: mentions of installation stops and "No" answers to derivation appear only alongside those steps themselves, and its points are linear – a failure branch ends the turn, beyond that only the success path continues
- Prompts that address the user – ask questions or relay release notes – speak in their language but keep OpenSpec terms in English: without this, a model replying in Russian translates them into Russian
- Prompts are proofread for 9b-27b instruct models: instructions sit where they execute, idioms are replaced with direct technical language, the `context` description in the setup step is translated from a sentence with nested quotes into a numbered list
- Cleanup after CLI installation cancellation is described by a mechanically checkable rule instead of "if files exist only for this setup"
- The stub "no `openspec/` – go run init" remains only in `/opsx-config`; it no longer enters the init prompt
- Support for `.openspec/` root is removed from the plugin: the CLI doesn't know about it – `OPENSPEC_DIR_NAME = 'openspec'` with no alternatives
- Minor things: grammar in the language question

## Capabilities

### Modified Capabilities
- `openspec-parsing`: single root `openspec/` instead of iterating `.openspec/` – the CLI doesn't know about the second option
- `plugin-lifecycle`: delete change works with a single directory `openspec/changes/{name}`
- `slash-commands`: `CONFIG_PROMPT` asks granularity with two options without time estimates and describes config without a YAML example; derivation prompt asks code exploration depth, requires covering both product and technical sides, and passes depth to sub-agents; final init section removes the marker even when there's nothing to validate; `/opsx-baseline` description matches the prompt

## Impact

- `src/lib/prompts.ts` – "Tasks" question and steps 5–6 in `CONFIG_PROMPT`; `specDerivePrompt(depthChosen)` instead of a constant; phases 0–3 and derivation constraints; derivation step gate in `buildInitPrompt`; `INIT_FINALLY`; config.yaml creation in `buildUpdatePrompt`
- `src/features/commands.ts`, `README.md` – `/opsx-baseline` description
- `src/lib/openspec.ts`, `src/lib/config.ts`, `src/lib/delete-change.ts` – single root `ROOT`/`CONFIG_PATH` instead of iterating `openspec` and `.openspec`; the `root` field in `OpenSpecSummary` is no longer needed
- `openspec/specs/openspec-parsing/spec.md`, `openspec/specs/plugin-lifecycle/spec.md` – requirements about root iteration are brought to a single root
- `src/lib/config.ts` / `src/sidebar.tsx` – following investigation, if `markerWritten` comes as `false` where the sidebar could write the file
- `test/prompts.test.ts` – tests for "Tasks" question composition, absence of old options, and depth question
- `src/lib/migrations.ts` – `MIGRATIONS` entry about the release (changes what the user sees in init); same language guard in the update completion prompt

## Non-goals

- Don't touch preflight: the `openspec --version` step stays as is, and no new agent instructions are added there
- Don't tell the agent in the prompt about internal plugin logic (what and when the sidebar writes, what's already created) and don't dictate shell call forms: the `mkdir` bug is fixed in code, and redirects like `2>/dev/null; echo "EXIT:$?"` are an agent habit, not our problem
- Don't bloat the prompt: edits in points 2 and 3 replace existing text rather than appending on top
- Don't save a round of conversation by mixing the depth question into capability list confirmation: by that point the project is already read – i.e. exactly the work whose cost the user controls
- Don't add a third depth mode or make depth configurable per-capability
- Don't move depth selection to `openspec/config.yaml` as a persistent rule: this is a decision for one baseline run, not a property of the project
- Don't touch `rules.proposal` and the Non-goals question – they read fine
- Don't figure out what to do with a capability the user added themselves in phase 2: responsibility for something made up lies with whoever wrote it down
