# Tasks

## 1. Dependency and tooling baseline

- [x] 1.1 Update the V1 SDK and pin the renderer and OpenSpec CLI; verify frozen dependency installation, SDK types and README compatibility versions.
- [x] 1.2 Regenerate the six OpenCode workflows with OpenSpec 1.14.3; verify generated version stamps and preservation of config and main specs.

## 2. Task progress compatibility

- [x] 2.1 Align task parsing with current OpenSpec and add parity tests covering nested/ordered tasks, markers, links, CRLF and grouping; verify against OpenSpec 1.14.3.
- [x] 2.2 Prepare 1.0.0 and its MIGRATIONS release notes for task counts and the expanded task view; verify migration tests, README and the built version.
- [x] 2.3 Exercise real OpenSpec initialization and change creation in an isolated fixture; verify the plugin detects tooling, versions and task progress.
- [x] 2.4 Retain and render task hierarchy, ordered labels and unfinished markers, with empty-description and empty-list states and a review reminder; verify narrow-sidebar rendering, live presentation updates and action availability.

## 3. Integrated verification

- [x] 3.1 Run lint, typecheck, build, the full tests and strict change validation; record results and any existing main-spec validation issues separately.
- [x] 3.2 Smoke-test the built plugin with an isolated OpenCode 1.19.4 host; record observed behavior and leave the installed V2/configuration intact.

## Workflow follow-up

- Review and archive this change separately before starting the V2 migration.
