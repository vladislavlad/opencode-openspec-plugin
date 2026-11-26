## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 1.0.0 and document the upgrade.
- [x] 1.4 Verify the packaged TUI on the supported hosts and run the release checks.

282 tests passed. A clean npm install of 1.0.0 passed with OpenCode supplying its runtime. The packaged TUI loaded specs and composed an Explore request on OpenCode 1.19.6 and showed the upgrade dialog when loaded on OpenCode 2.

## 2. Migration to the dedicated V2 package

- [x] 2.1 Prepare a maintenance patch with the dedicated V2 package in the upgrade dialog and document the manual path for 1.0.0. Add the 1.0.2 release notes and verify the package.

The patched archive passed all 282 tests and showed the dedicated V2 package in OpenCode 2.4.1 and 2.4.2. The published 1.0.0 package was installed directly from npm in OpenCode 1.19.6.
