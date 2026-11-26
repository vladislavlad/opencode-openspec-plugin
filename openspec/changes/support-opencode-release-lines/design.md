## Context
V1 releases already in npm check the latest dist-tag for updates. V2 has a
different TUI SDK. Its loader recognizes a TUI export alongside an optional
server part. OpenSpec 2.2 moved project skills to `.agents/skills`.

## Decisions
- Give each line its own npm package and its own `latest` tag. The V1 branch
  ships an upgrade dialog that points to the V2 package without loading the V1 renderer.
- Validate the package name, major version and Git tag in the shared release workflow.
  Verify an already published version against the checked-out commit.
- Ship only a TUI export in V2. Reject unsupported host versions before
  registering commands or slots.
- Prefer configured legacy command text, then attach the scoped skill on the
  native session prompt. Continue to resolve the action before session mutation.
- Use the on-disk update flag when available. Complete any prior V1 update
  on the running V2 build and preserve existing setup checkpoints.
