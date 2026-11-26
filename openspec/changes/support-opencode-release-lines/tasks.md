## 1. Release compatibility

- [x] 1.1 Pin and build the supported host integration. Route npm updates and publication to this line.
- [x] 1.2 Update generated tooling and runtime workflows to OpenSpec 2.2. Preserve project data and support legacy commands.
- [x] 1.3 Add MIGRATIONS release notes for 2.0.0 and document the upgrade.
- [x] 1.4 Audit the lockfile and verify the packaged TUI on the supported hosts and run the release checks.

415 tests passed. The packaged plugin and migration dialog were checked on OpenCode 2.4.1 and 2.4.2. A clean npm install passed. The npm audit of the frozen Bun lockfile returned no advisories.

## 2. Separate npm package

- [x] 2.1 Use the dedicated V2 npm package in Settings and installation guides. Record the distribution change in the 2.0.0 release notes.
- [x] 2.2 Update CI actions and validate the package, tag and already published revision. Document the first publication and verify the release candidate.

The dedicated V2 package passed a clean npm install and publish dry-run. The workflow checks covered an absent version, a matching revision, a revision conflict, and a registry error.
