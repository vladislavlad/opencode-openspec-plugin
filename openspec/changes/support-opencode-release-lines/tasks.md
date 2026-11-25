## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 2.0.0 and document the upgrade.
- [x] 1.4 Verify the packaged TUI on the supported hosts and run the release checks.

415 tests passed. The packed TUI opened the existing project and its Explore dialog on OpenCode 2.4.1 after replacing the V1 package in the migrated profile. Strict validation and npm dry-run passed.
