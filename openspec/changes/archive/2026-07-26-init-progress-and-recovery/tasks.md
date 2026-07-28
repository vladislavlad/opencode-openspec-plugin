## 1. Root detection via config.yaml

- [x] 1.1 In `src/lib/openspec.ts` add a listing helper that swallows errors and rewrite root detection: a directory is considered root if it contains subdirectories **or** the file `config.yaml`
- [x] 1.2 Verify that `readOpenSpec` returns a summary with empty `specs`/`changes` when subdirectories don't exist yet (missing `${root}/specs` and `${root}/changes` yield empty lists)
- [x] 1.3 Update/add unit tests for root detection: only `config.yaml`; only subdirectories; neither

## 2. Reading the setup marker

- [x] 2.1 In `src/lib/updates.ts` add `readInitFlag(client)`: parse `openspec/config.yaml` (roots `openspec`/`.openspec`), return `{ inProgress: boolean, done: InitStage[] }` – `plugin.init.in-progress` and `plugin.init.done` with unknown values dropped
- [x] 2.2 Connect `readInitFlag` in `load()` alongside `readUpdateFlag` (cheap on every poll so the banner dismisses after the agent removes the marker)

## 3. Prompts: marker, checkpoints, removal

- [x] 3.1 Verify on live CLI that `openspec init` does not overwrite an existing `config.yaml` and that repeated init over a ready project is safe
- [x] 3.2 In preflight add writing the marker `plugin.init.in-progress: true` **before** CLI installation and rollback of the marker when "Cancel" is chosen
- [x] 3.3 Add checkpoints to `plugin.init.done` after each stage: `["tooling"]` → `["tooling","config"]` → `["tooling","config","specs"]`
- [x] 3.4 In the final block add `openspec validate --specs`, error fixes, and removal of the `init:` block only on successful validation – in all completion branches
- [x] 3.5 Add `INIT_DISMISS_PROMPT` that removes the `init:` block and does nothing else
- [x] 3.6 `OPENSPEC_INIT_ONLY_PROMPT` (fallback path) also removes the marker so setup doesn't remain flagged
- [x] 3.7 In `CONFIG_PROMPT` add a requirement to preserve an existing `plugin:` block unchanged when overwriting config.yaml

## 4. Status line instead of full-screen indicator

- [x] 4.1 Derive the setup stage from `plugin.init.done` – first uncheckedpointed: "Installing OpenSpec" → "Configuring project" → "Deriving specs" → "Validating specs"
- [x] 4.2 Replace the full-screen "Initializing" block with a compact status line showing phase text and an animated dot; keep the 500 ms animation
- [x] 4.3 Remove the `!setupInProgress()` gate from the browser branch, keeping it for the `NotInitialised` screen; ensure Settings still takes priority
- [x] 4.4 Verify live population: during derivation the Specifications section expands on the first spec and fills via polling

## 5. Recovery after unfinished initialization

- [x] 5.1 Unfinished-setup banner when marker is set, `tooling` is checkpointed, and agent is idle: Resume and Dismiss buttons (`warning`)
- [x] 5.2 Resume and Dismiss are disabled during `busy()` – prompt not sent, toast "Wait until the agent finishes working"
- [x] 5.3 Warning above Init button if turn completed without tooling or marker remains uncheckedpointed; Init repeats setup from scratch
- [x] 5.4 Banner reports the stopped stage – first uncheckedpointed stage from `done`
- [x] 5.5 Split init prompt into stages and build a builder `buildInitPrompt(done)` that includes only uncheckedpointed stages
- [x] 5.6 Resume calls the builder with stages from `plugin.init.done`; unit tests for all assembly variants
- [x] 5.7 Dismiss sends `INIT_DISMISS_PROMPT` (agent turn), not a local banner dismissal
- [x] 5.8 "Reopen opencode …" banner suppressed while marker is set – Reload and Resume/Dismiss are mutually exclusive
- [x] 5.9 Init screen shown when marker is set but `tooling` is not checkpointed, even if `.opencode`/`openspec` exist
- [x] 5.10 Resume button – color `secondary`
- [x] 5.11 Unify restart prompt: one text "Reload opencode to activate new commands and skills" in `warning` color with a "Reload OpenCode" button in `error` color for both successful and failed ephemeral registration; action row hidden only on failure
- [x] 5.12 Align the `prompt-sending` spec with code: `quitOpencode` sends `exit`, not `app.exit`

## 6. Release and verification

- [x] 6.1 Add an entry to `MIGRATIONS` (`src/lib/migrations.ts`) for the next release: `releaseNotes` about visible specs during init, correct initialization detection, and unfinished-init highlighting; `instructions` empty
- [x] 6.2 Run `bun run typecheck`, `bun run test`, `bun run build`
- [x] 6.3 Verify live on an empty project: after init without derivation the sidebar shows the browser, not the Init button
- [x] 6.4 Verify live full init with derivation: specs appear in the sidebar as they are written, flag is removed, banner doesn't remain
- [x] 6.5 Verify interrupted turn mid-setup: after idle the Resume banner appears, repeat completes setup without re-asking completed stages
- [x] 6.7 Verify Dismiss: `init` section is removed by the agent, banner dismisses, then the restart prompt appears
- [x] 6.8 Verify CLI installation cancellation: marker and created `openspec/` are rolled back
- [x] 6.6 `openspec validate init-progress-and-recovery --strict`
