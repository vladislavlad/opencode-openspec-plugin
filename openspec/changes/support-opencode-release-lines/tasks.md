## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 2.0.0 and document the upgrade.
- [x] 1.4 Audit the lockfile and verify the packaged TUI on the supported hosts and run the release checks.

415 tests passed. The packaged plugin and migration dialog were checked on OpenCode 2.4.1 and 2.4.2. A clean npm install passed. The npm audit of the frozen Bun lockfile returned no advisories.
