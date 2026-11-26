## Context

OpenSpec now checks skill contents and references for drift. Modern skill files intentionally carry no release number. The sidebar can read project files through the host, and the agent can run the CLI in the project's environment.

## Decisions

- Record `plugin.tooling-version` after successful `openspec init` or `openspec update` using the actual result of `openspec --version`. The value describes the project's last verified tooling and can differ from a separately installed CLI.
- Read the value from the existing config poll. Previously generated version stamps remain a fallback for projects with no recorded version. Keep registry lookups outside the poll.
- Refresh OpenSpec remains available for repairs and version verification even without registry access. Compare the verified version with the registry version when available.
- Reload the catalog after CLI-only refresh. Offer a full restart for plugin updates, which need to load a new build.
- Keep the release workflow's checks and run Build before Test, matching the regular CI workflow.
