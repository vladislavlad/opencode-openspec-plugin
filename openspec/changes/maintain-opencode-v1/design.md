## Context
The V1 TUI uses a different SDK from V2. OpenCode 2.4.1 can migrate a global
`tui.json` when the V2 global `cli.json` does not exist.

## Decisions
- Bundle the V1 renderer as a lazy import and expose a V2 setup handler that
  points to the dedicated OpenCode 2 npm package. Users replace their entry and keep its
  options. Project-local config requires manual setup in the V2 global file.
- Keep npm latest on 1.x, including for older clients that do not filter the
  npm major. Validate the release channel before publishing.
- Resolve existing command names through the V1 catalog. If a workflow only has
  a skill, put its request into the composer or submit it under the normal gate.
