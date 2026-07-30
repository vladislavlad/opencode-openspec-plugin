## Why

The writing style reaches artifact generation through `openspec/config.yaml`, where it lands as a single word — the file currently reads `Writing style: Balanced`. The agent that later writes proposals, specs and tasks has no definition of that word: balanced between what and what?

The ambiguity is not at selection time — the user and the configuring agent both see the option list and the questions around it. It is at consumption time, where only the bare word survives.

## What Changes

- Describe the three options along one axis at selection time: Technical = precise, implementation-focused · Product = outcome-focused, user-oriented · Balanced = technical precision where it matters, readable by non-engineers.
- Persist the chosen style together with its one-line meaning, so the consuming agent reads `Writing style: Balanced (technical precision where it matters, readable by non-engineers)` instead of a bare name.

## Capabilities

### Modified Capabilities
- `project-config`: the Style question carries a description per option, and the config write persists the chosen style with its meaning

## Impact

- `src/lib/config-prompt.ts` — two edit sites: the "Style" question (step 3) and the `context` composition (step 6, item 4)
- No runtime or API changes; only the prompt text sent to the agent during `/opsx-config` and the init flow

## Non-goals

- Not introducing new writing styles beyond the existing three
- Not moving where the style lives — it stays a line in the `context` block
- Not touching `rules` or any other part of config.yaml
