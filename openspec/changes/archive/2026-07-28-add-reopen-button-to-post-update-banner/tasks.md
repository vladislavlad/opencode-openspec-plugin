## 1. Add Reopen button to PostUpdateBanner

- [x] 1.1 In `src/components/update-flow.tsx`, add `onReopen` prop to `PostUpdateBanner` and render a gated "Reopen OpenCode" Button (`error`) below the reopen message text
- [x] 1.2 In `src/sidebar.tsx`, pass `onReopen={() => quitOpencode(props.api)}` to `PostUpdateBanner`

## 2. Migration entry

- [x] 2.1 Add a MIGRATIONS entry in `src/lib/migrations.ts` for this release version with `releaseNotes` noting that the post-update banner now has a clickable reopen button
