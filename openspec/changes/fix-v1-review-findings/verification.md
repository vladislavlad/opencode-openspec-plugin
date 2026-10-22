# Verification — 2026-10-22

## Release and scope

- Plugin package and built `VERSION`: **1.0.0**, targeting OpenCode V1. The future OpenCode V2 port is reserved as **2.0.0** in README and the active change plans.
- Compatibility baseline remains OpenCode/SDK **1.19.4**, OpenTUI/Keymap **0.4.5**, OpenSpec **1.14.3**.
- `@opentui/keymap` is pinned as a development dependency for real dispatcher tests and SDK type resolution. Production command code uses the host's existing Keymap instance.
- Both active changes remain unarchived; main `openspec/specs/` and `openspec/config.yaml` are unchanged. Work remains on `main` without commits, tags, publishing or pushes.

## Four findings covered

1. **Busy deletion confirmation:** interactive render tests open confirmation while idle, switch to busy/retry, verify Delete invokes feedback without deleting or navigating, verify Cancel still works, and verify deletion after returning to idle. Filesystem tests also keep real temporary change files intact when the guard rejects at entry or after directory lookup. Idle deletion, already-missing changes and idle remote fallback remain functional.
2. **Lost command arguments:** tests dispatch through the real `@opentui/keymap` package with string `payload`, verifying trimmed multiline arguments reach the baseline/config templates. Missing, blank and non-string payloads leave templates unchanged. Temporary filesystem commands use the same path.
3. **Commands bypassing busy:** baseline, config and temporary commands are exercised in busy and retry states; no clear, append or submit calls occur and the existing draft stays intact. Route changes are checked at invocation, and idle/home invocations still clear, append and submit in order.
4. **CRLF task grouping:** full parser output equals the LF fixture, including named groups, nested depths, numbered tasks, markers and completion counts; nesting resets at the next CRLF heading.

The regression tests were run before implementation: **15 failed / 35 passed** across the four focused files, reproducing the defects. After implementation all **50 focused tests passed**.

## Final checks

- `bun install --frozen-lockfile`: passed (185 installs checked across 216 packages).
- `bun run test`: **281 passed, 0 failed**, 20 files; 20 tests added to the previous 261-test baseline.
- `bun run lint`: passed.
- `bun run typecheck`: passed.
- Additional strict TypeScript check of `test/commands.test.ts` and `test/delete-change.test.ts`: passed.
- `bun run build`: passed; `dist/index.js` contains `VERSION = "1.0.0"` and the `1.0.0` migration entry.
- `openspec validate fix-v1-review-findings --strict`: passed.
- `openspec validate refresh-v1-compatibility --strict`: passed.
- `git diff --check`: passed.

`openspec validate --specs --strict --json` still exits nonzero because of the same **13 existing requirement-length warnings** in init-flow, project-config, prompt-style, sidebar-ui, spec-derivation and update-flow. No new main-spec changes were made.

## Evidence limits

The current fixes are verified with OpenTUI render interactions, the real V1 Keymap dispatcher and temporary filesystem operations; no model turn or external publish was performed. The isolated full OpenCode 1.19.4 host smoke for the earlier provisional build is recorded in `../refresh-v1-compatibility/verification.md`; it was not rerun for these fixes.

The V1 command contract supplies caller arguments in `CommandContext.payload`. Native palette/autocomplete selection in OpenCode 1.19.4 dispatches without payload, so the fix preserves supplied arguments but does not add an argument-entry UI to the host. This distinction is checked against the V1 sources in `packages/tui/src/keymap.tsx`, `packages/tui/src/component/command-palette.tsx` and `packages/tui/src/component/prompt/autocomplete.tsx`, and is reflected in the change requirements.

## Authorized V1 checkpoint and CI/CD review

The user subsequently authorized committing the ready V1 work and creating local tag `v1.0.0` before the V2 port. V2 changes must remain uncommitted and nothing is to be pushed or published.

- CI runs on pushes and pull requests to main. Release runs on pushed `v*` tags; creating a local tag alone does not start GitHub Actions.
- Release now rejects branch runs and tags that differ from package.json, then runs lint, types, tests, strict active-change validation, build and package dry-run before npm publish. Release runs for the same ref are serialized.
- Workflow YAML parsed successfully; the tag guard accepts `tag/v1.0.0` and rejects `tag/v0.4.0` and `branch/main`.
- Final V1 checks passed again: 281 tests, lint, types, build and both strict change validations. npm pack dry-run includes the built bundle, README, LICENSE and package.json, version 1.0.0.
- The public GitHub API reports the last three release workflows succeeded, including [the v0.4.0 release](https://github.com/vladislavlad/opencode-openspec-plugin/actions/runs/30564453684). Current private npm Trusted Publisher settings cannot be inspected here; the existing workflow filename, repository identity, hosted runner, Node 24 and OIDC permission are retained. No new workflow or publication was triggered.
