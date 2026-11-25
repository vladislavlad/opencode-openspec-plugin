## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 1.0.1 and document the upgrade.
- [x] 1.4 Verify the packaged TUI on the supported hosts and run the release checks.

282 tests passed. The packed TUI loaded specs and composed the Explore skill request on OpenCode 1.19.6. OpenCode 2.4.1 carried over the global plugin entry and showed the required update dialog. Strict validation and npm dry-run passed.
