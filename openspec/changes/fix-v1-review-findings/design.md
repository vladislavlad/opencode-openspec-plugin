# Design

## Context

See proposal.md for the four review findings. This change builds on the unarchived `refresh-v1-compatibility` work. The user chose release 1.0.0 for OpenCode V1 and reserved 2.0.0 for OpenCode V2. The sidebar owns the reactive busy state; command registrations also run on the home screen, outside the sidebar.

## Goals / Non-Goals

**Goals:** Close the four reproduced paths and prove both blocked and successful actions using render tests, the real V1 Keymap dispatcher, local temporary directories and parser fixtures.

**Non-Goals:** Replace host command input handling, introduce another poll or operation queue, migrate to V2, or synchronize main specs.

## Decisions

1. Pass the existing gate to the final Delete button; keep Cancel available. Supply a required idle-check callback to `deleteChange`, checking before local-root resolution, after that asynchronous lookup and before a fallback prompt. The sidebar supplies its existing busy state and toast. A UI-only fix would leave direct calls and a session becoming busy during lookup unprotected. The callback avoids importing UI or duplicating session state in the filesystem helper.
2. Read a string argument from the typed Keymap command context's `payload`. Empty or non-string payloads submit the template unchanged. Pin `@opentui/keymap` 0.4.5 as a development dependency: the plugin API's optional peer otherwise leaves this integration unchecked. Test actual dispatch rather than calling a hand-written imitation of the handler. Do not treat `context.input` (key input) or unrelated palette filter text as arguments. In V1.19.4 native palette/autocomplete selection dispatches without payload; support payloads supplied by a caller without claiming that native selection supplies a typed suffix.
3. At command execution, resolve the current session from `api.route.current`, reject `busy` and `retry` with the sidebar's existing wait message before calling `submitPrompt`. Read the route at invocation, not registration, so navigation and home-screen invocation work. Apply the same check through the shared registration function to baseline, config and temporary filesystem commands.
4. Split task source on LF or CRLF before existing heading and checkbox parsing. This preserves the V1 refresh's checkbox semantics and resets nesting at each heading. Add a new line-ending requirement rather than replacing the task-parsing requirement already modified by the earlier change.

## Risks / Trade-offs

- Session status is a snapshot, not a host transaction lock → recheck after the asynchronous filesystem lookup; do not claim cancellation of an already-started filesystem operation.
- Native V1 palette selection supplies no arguments → preserve no-payload behavior and explicitly test the supported payload contract.
- Two active changes touch related capabilities → use non-overlapping requirement deltas and validate both changes before completion.

## Migration Plan

No data migration or post-update instructions are needed. Move the provisional unpublished release notes into the 1.0.0 entry and include the fixes. Build and validate locally; commits, publishing, spec synchronization and archive remain outside this request.
