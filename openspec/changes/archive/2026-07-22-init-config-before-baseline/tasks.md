## 1. Restructure prompts in src/lib/prompts.ts

- [x] 1.1 Обновить `OPENSPEC_INIT_PROMPT`: после успешного init всегда запускать config setup (через CONFIG_PROMPT), затем спрашивать про derivation specs
- [x] 1.2 Упростить `SPEC_BASELINE_PROMPT`: убрать встроенный config, оставить только SPEC_DERIVE_PROMPT; добавить проверку наличия config.yaml в начале

## 2. Обновить spec sidebar-ui

- [x] 2.1 Синхронизировать delta spec из change с основным openspec/specs/sidebar-ui/spec.md
