# Tasks

## 1. Protect confirmed deletion

- [x] 1.1 Apply the existing busy gate to final Delete, keeping Cancel available; verify idle-to-busy/retry, cancellation and return-to-idle with interactive render tests.
- [x] 1.2 Require the sidebar idle guard at the deletion boundary and after directory lookup; verify temporary files survive rejected checks and idle local deletion and remote fallback still work.

## 2. Repair command execution

- [x] 2.1 Pin the V1 Keymap development dependency and use its typed payload contract; verify actual dispatcher argument forwarding, empty payload behavior and temporary command registration.
- [x] 2.2 Guard all registered prompt commands using the current routed session before touching input; verify busy/retry rejection, route changes, idle execution and home invocation through the real dispatcher.

## 3. Preserve CRLF task groups

- [x] 3.1 Normalize LF/CRLF splitting without changing checkbox semantics; verify complete parser output equality, group titles and nesting resets using regression fixtures.
- [x] 3.2 Prepare the 1.0.0 MIGRATIONS release notes with the user-visible fixes and no post-update instructions; verify package/build version 1.0.0, document 2.0.0 for OpenCode V2 and run migration tests.

## 4. Integration verification

- [x] 4.1 Run the complete test suite, lint, typecheck, build, frozen dependency installation and strict validation of both active changes; record results and remaining validation warnings in verification.md.
- [x] 4.2 Gate release on matching version/tag and the same CI checks, validate workflow YAML, exercise accepted/rejected tag inputs and inspect npm pack dry-run before the authorized V1 commit and local tag.
