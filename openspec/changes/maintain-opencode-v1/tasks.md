## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 1.0.1 and 1.0.2 and document the upgrade.
- [x] 1.4 Verify the packaged TUI on the supported hosts and run the release checks.

282 tests passed. A clean npm install of 1.0.2 passed with OpenCode supplying its runtime. The packaged TUI loaded specs and composed an Explore request on OpenCode 1.19.6 and showed the upgrade dialog when loaded on OpenCode 2.
