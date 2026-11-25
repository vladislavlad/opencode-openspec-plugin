## Context
V1 releases already in npm check the latest dist-tag for updates. V2 has a
different TUI SDK. Its loader recognizes a TUI export alongside an optional
server part. OpenSpec 2.2 moved project skills to `.agents/skills`.

## Decisions
- Keep `latest` on 1.x and publish 2.x on `opencode-v2`. The V1 branch ships a V2
  upgrade dialog whose entrypoint does not load the V1 renderer.
- Ship only a TUI export in V2. Reject unsupported host versions before
  registering commands or slots.
- Prefer configured legacy command text, then attach the scoped skill on the
  native session prompt. Continue to resolve the action before session mutation.
- Use the on-disk update flag when available. Complete any prior V1 update
  on the running V2 build and preserve existing setup checkpoints.
