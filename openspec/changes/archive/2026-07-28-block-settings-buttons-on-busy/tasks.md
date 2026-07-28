## 1. Block Check Versions and Reload buttons on busy

- [x] 1.1 In `src/components/settings.tsx`, spread `{...props.gate}` on the "Check Versions" Button (line 84) so it is disabled while the agent is busy
- [x] 1.2 Spread `{...props.gate}` on the "Reload" Button (line 97) for the same reason

## 2. Migration entry

- [x] 2.1 Add a MIGRATIONS entry in `src/lib/migrations.ts` for this release version with `releaseNotes` noting that Check Versions and Reload buttons are now blocked while the agent is busy
