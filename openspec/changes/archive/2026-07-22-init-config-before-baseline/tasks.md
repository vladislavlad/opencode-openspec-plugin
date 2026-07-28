## 1. Restructure prompts in src/lib/prompts.ts

- [x] 1.1 Update `OPENSPEC_INIT_PROMPT`: after successful init always trigger config setup (via CONFIG_PROMPT), then ask about derivation specs
- [x] 1.2 Simplify `SPEC_BASELINE_PROMPT`: remove embedded config, keep only SPEC_DERIVE_PROMPT; add a check for the presence of config.yaml at the beginning

## 2. Update sidebar-ui spec

- [x] 2.1 Sync delta spec from change with main openspec/specs/sidebar-ui/spec.md
