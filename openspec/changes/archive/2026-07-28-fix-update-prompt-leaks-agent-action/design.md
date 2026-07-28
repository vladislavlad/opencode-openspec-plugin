## Context

`buildMigrationPrompt` in `migrations.ts` builds a single prompt that mixes release notes (for the agent to relay to the user) with an agent-only cleanup instruction ("remove plugin.update-in-progress block"). The agent treats everything as content and echoes the cleanup instruction back.

The current structure appends sections in order: migration steps, release notes, clearFlag. There's no framing that tells the agent which parts are actions vs relayable content. The clearFlag instruction appears after release notes with no separator, so the agent sees it as part of the relayable block.

## Goals / Non-Goals

**Goals:**
- Structure the prompt into explicit stages separated by `---` so the agent knows what to execute silently and what to relay to the user.

**Non-Goals:**
- Not reworking how release notes are authored or displayed.
- Not adding a new prompt parsing framework.

## Decisions

- Restructure `buildMigrationPrompt` output into 4 ordered stages:
  1. **Context** — version range + restart notice (no separators)
  2. **Migration steps** — "Execute these migration steps in order:", wrapped with `---` before and after; skipped entirely when there are no steps
  3. **Clear flag** — "Remove the `plugin.update-in-progress` block from config.yaml", wrapped with `---` before and after (only when `opts.clearFlag`)
  4. **Release notes** — "Now summarize these release notes for the user, grouped by version:", wrapped with `---` before and after

- The critical change: every block of instructions and release notes is delimited by `---` on both sides. Agent actions (migration steps, clearFlag) come first with imperative headers. Release notes are preceded by "summarize for the user" — explicitly marking them as relayable content. This avoids a fragile separator convention and instead uses instruction framing that LLMs follow reliably.

## Risks / Trade-offs

- [Agent still leaks instructions] → Unlikely with imperative staging + `---` delimiters — the "summarize for the user" boundary is a well-established prompt pattern. If it happens, fallback is current behavior (non-breaking).
