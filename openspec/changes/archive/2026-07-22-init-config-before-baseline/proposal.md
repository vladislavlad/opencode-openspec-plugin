## Why

The `config.yaml` setup is currently embedded inside the baseline stage – if the user only runs init or declines baseline, the config remains empty and subsequent artifacts are generated without context. Config should always run immediately after openspec initialization. The derive (baseline) stage remains optional – triggered only when the user answers "Yes", as it is now. We don't break the logic, just swap the order: config → ask → derive (if yes).

## What Changes

- Extract the config step from `SPEC_BASELINE_PROMPT` into a separate step that always runs after init
- Update `OPENSPEC_INIT_PROMPT`: after successful init → first config → then optionally baseline (derivation specs only)
- Simplify `SPEC_BASELINE_PROMPT`: remove embedded config, keep only derivation specs

## Capabilities

### New Capabilities

### Modified Capabilities
- `sidebar-ui`: Change the step sequence in the init flow – config always runs first after initialization, baseline follows

## Impact

- `src/lib/prompts.ts`: restructure `OPENSPEC_INIT_PROMPT`, `SPEC_BASELINE_PROMPT`
- Init button behavior in sidebar: now 2 stages instead of one combined stage

## Non-goals

- We don't change the config and baseline logic itself – only their call order
- We don't touch `/opsx-config` and `/opsx-baseline` slash commands as standalone commands
