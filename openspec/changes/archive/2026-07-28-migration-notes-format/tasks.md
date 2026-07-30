## 1. Update buildMigrationPrompt in migrations.ts

- [x] 1.1 Add `## Release Notes` heading before version-grouped notes block in Stage 4 of `buildMigrationPrompt`
- [x] 1.2 Change release notes rendering from `.join(" ")` paragraph to bullet list (`- Item text`) per item

## 2. Verify and test

- [x] 2.1 Run typecheck and build to ensure changes compile
- [x] 2.2 Validate the change with `openspec validate migration-notes-format --strict`
