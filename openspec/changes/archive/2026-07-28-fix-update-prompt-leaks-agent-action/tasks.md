## 1. Restructure migration prompt into explicit stages with separators

- [x] 1.1 In `src/lib/migrations.ts`, restructure `buildMigrationPrompt` so that: (a) agent actions (migration steps, clearFlag) come first with imperative headers and `---` separators before/after each block, and (b) release notes are preceded by "Now summarize these release notes for the user, grouped by version:" and also wrapped with `---` separators

## 2. Migration entry

- [x] 2.1 Add a MIGRATIONS entry in `src/lib/migrations.ts` for this release version with `releaseNotes` describing that update prompts no longer leak internal instructions into release notes shown to the user
