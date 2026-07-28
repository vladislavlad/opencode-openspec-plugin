## Context

Current init flow in `src/lib/prompts.ts`:
- `OPENSPEC_INIT_PROMPT` → run init command → ask user about specs → if yes, run `SPEC_BASELINE_PROMPT`
- `SPEC_BASELINE_PROMPT` → Step 1: config (if not set) + Step 2: derive specs

Problem: config is nested inside baseline. If the user skips baseline or only runs init, the config remains empty.

## Goals / Non-Goals

**Goals:**
- Config always runs immediately after successful init
- Baseline (derivation specs) – a separate optional step after config

**Non-Goals:**
- We don't change the config and baseline logic inside prompts
- We don't touch slash commands `/opsx-config`, `/opsx-baseline`

## Decisions

1. **Split `SPEC_BASELINE_PROMPT` into two stages**: config is extracted into a separate block that runs immediately after init; baseline contains only derivation specs.
2. **Update `OPENSPEC_INIT_PROMPT`**: sequence → init command → config (always) → ask about deriving specs (optional).
3. **Create constant `CONFIG_SETUP_PROMPT`** – a wrapper around `CONFIG_PROMPT` that doesn't check for existing context but always triggers setup.

## Risks / Trade-offs

- [Risk] The user may want to skip config → Mitigation: config is idempotent and fast; on re-run it picks up the existing config
- [Trade-off] The number of steps in init flow increases from 2 to 3 (init → config → optional baseline)
