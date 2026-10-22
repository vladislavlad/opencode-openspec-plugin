# Design

## Context

See proposal.md for scope. npm reports OpenCode 1.19.4 and OpenSpec 1.14.3 as the current stable versions on 2026-10-22. OpenCode V1 still uses OpenTUI 0.4.5 and the `@opencode-ai/plugin/tui` entry point. The system OpenCode binary is already V2.

## Goals / Non-Goals

Keep the existing V1 host API and bring task counting into agreement with the current OpenSpec CLI. Schema-selected task globs, standalone stores, and V2 APIs are outside this change.

## Decisions

- Resolve the development SDK to 1.19.4, restrict its peer range to `>=1.18.0 <2.0.0`, and pin the OpenTUI development renderer to the V1 host's 0.4.5. Avoid unbounded renderer upgrades while preparing the V1 baseline.
- Add OpenSpec 1.14.3 as a development dependency so CI can compare the parser with the actual pinned CLI and generate its real tooling. The plugin runtime does not import or execute OpenSpec.
- Mirror OpenSpec's checkbox grammar locally and keep heading grouping. Test against OpenSpec's `parseTaskLines` and `countTasksFromContent` as an independent reference, including CRLF, links, nesting and incomplete markers.
- Retain task depth, original checkbox marker, and ordered-list label in the model. Normalize indentation relative to each group and cap visual indentation at three levels so long descriptions remain readable in a narrow sidebar. Render all unfinished tasks visibly; custom markers stay literal and do not acquire a new status meaning. Include these fields in poll equality so presentation-only edits refresh the view.
- Regenerate the existing six OpenCode workflows with `openspec update --force`. Preserve project context, main specs, and unrelated user changes.
- Release the local package as 1.0.0 for OpenCode V1, per the user's versioning decision; reserve 2.0.0 for the OpenCode V2 port. Add release notes for the final scope. No post-update file migration is required.

## Risks / Trade-offs

- [Upstream parser is an internal API] → Use it only in tests with an exact dev dependency; a future OpenSpec upgrade must recheck the contract.
- [Typecheck and render tests cannot prove host loading] → Attempt a V1 smoke with an isolated binary and configuration, and record precisely which host behavior was observed.
- [OpenCode 2 breaks plugin, server, and client configuration APIs] → Keep V2 migration separate and document the supported major version.

## Migration Plan

Rebuild the local artifact and verify it before any release. Publishing and archive are separate follow-up actions. Existing main specs remain untouched until a requested sync/archive.
