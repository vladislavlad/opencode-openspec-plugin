## Why

`openspec init` creates `openspec/config.yaml` and all the tooling (6 commands + 6 skills in `.opencode/`), but **does not create** the subdirectories `openspec/specs` and `openspec/changes`. Root detection requires at least one subdirectory, so immediately after a successful init `readOpenSpec` returns `null`, and `initialised` remains `false`.

This causes two defects:

1. **False Init screen.** If specs were not derived (empty project or the user answered "No" at the derivation step), the turn completes – and the sidebar shows the Init button again, even though initialization completed successfully. The prompt explicitly allows this scenario ("project directory is empty, so no specs were derived"), but the UI breaks on it.
2. **Nothing visible during setup.** The "Initializing" indicator covers both the init screen and the browser for the entire turn. Spec derivation – the longest phase – leaves the user unable to see specs populating.

Separately: an unfinished initialization (turn interrupted, opencode closed mid-setup) is indistinguishable from "initialization never started" – context is lost, there's no prompt to continue.

## What Changes

- Root detection: a directory is considered root if it contains subdirectories **or** the file `config.yaml`. Immediately after `openspec init` the sidebar considers the project initialized
- The "Initializing" indicator no longer covers the browser: during setup a compact status line appears above content, and sections populate live via regular polling
- Setup writes checkpoints to `openspec/config.yaml`: the agent writes `plugin.init.in-progress: true` **before** installing CLI (verified: `openspec init` does not touch an existing config.yaml) and appends to `plugin.init.done` after each stage – `tooling` → `config` → `specs`. The `init` section is removed entirely only after successful validation
- Cancelling CLI installation at the package manager question rolls back the created marker
- The status line shows the stage from `plugin.init.done`: installing → configuring → deriving → validating
- Marker remains, agent idle → banner with the stopped-at stage and Resume / Dismiss buttons
- Resume skips completed stages: `buildInitPrompt(done)` assembles a prompt only from uncheckedpointed stages
- Dismiss is an agent turn that removes the `init` section, not a local banner dismissal
- The restart opencode prompt is suppressed while setup is in progress or dismissed: Reload and Resume/Dismiss are mutually exclusive
- The restart prompt became unified for both outcomes of ephemeral registration – previously on success one text without a button was shown, on failure another in red, like an error. Now always "Reload opencode to activate new commands and skills" in `warning` color with a "Reload OpenCode" button in `error` color; the action row is hidden only on failed registration, because its `/opsx-*` commands won't resolve
- `quitOpencode` closes opencode by sending `exit` instead of native `app.exit` – synchronous exit interrupted rendering and left an escape-sequence fragment in the terminal
- Stage `tooling` not checkpointed → Init screen is shown, and Init starts setup from scratch even if `.opencode` and `openspec` already exist (repeated `openspec init` is safe – verified)
- `CONFIG_PROMPT` must preserve an existing `plugin:` block – otherwise overwriting config.yaml at the configuration step will erase the `init` marker and `update-in-progress`
- Setup interrupted before the `tooling` checkpoint → above the Init button "Setup aborted – press "Init" to continue" in `warning` color

## Capabilities

### Modified Capabilities
- `openspec-parsing`: root is determined by subdirectories **or** `config.yaml`; reading the `plugin.init` marker (`in-progress` + `done`) from config.yaml
- `sidebar-ui`: status line instead of full-screen indicator, live section population during setup, unfinished-setup banner with Resume/Dismiss, Reload banner suppression until completion, Init screen when tooling is not checkpointed
- `slash-commands`: init prompt manages the marker and per-stage checkpoints, skips completed stages and removes the marker after validation; separate Dismiss prompt; `CONFIG_PROMPT` preserves the `plugin:` block
- `prompt-sending`: `quitOpencode` closes opencode by sending `exit` instead of `app.exit`

## Impact

- `src/lib/openspec.ts` – root detection via `config.yaml`, shared listing helper
- `src/lib/updates.ts` – `readInitFlag(client)`: `plugin.init.in-progress` and list of `done`; shared config.yaml parsing with `readUpdateFlag`
- `src/lib/prompts.ts` – `INIT_STAGES`, per-stage checkpoints, `buildInitPrompt(done)`, `INIT_DISMISS_PROMPT`; marker and rollback on Cancel in preflight; `OPENSPEC_INIT_ONLY_PROMPT` also removes the marker; `plugin:` block protection in `CONFIG_PROMPT`
- `src/sidebar.tsx` – status line with stage, full-screen gate removal, Resume/Dismiss banner, restart prompt suppression, Init screen when tooling is not checkpointed, rewritten failed-registration block
- `src/lib/send-prompt.ts` – `quitOpencode` via sending `exit`
- `src/lib/migrations.ts` – release entry (user-facing behavior change)
- `test/openspec.test.ts`, `test/updates.test.ts`, `test/prompts.test.ts` – root detection, flag reading, prompt assembly

## Non-goals

- Do not split Resume within spec derivation: baseline sub-stages are not checkpointed, derivation restarts entirely (it is idempotent)
- Do not split initialization across multiple agent turns – remains one turn (Dismiss and Resume are separate turns)
- Do not recover the `tooling` stage from files on disk: source of truth is `plugin.init.done`, so Init always starts from scratch
- Do not touch the update flow (`update-in-progress`) – only protect the `plugin:` block from overwrite
- Do not create `openspec/specs` and `openspec/changes` via the plugin – the plugin remains read-only over the filesystem
