## 1. Style descriptions and persistence in config-prompt.ts

- [x] 1.1 Add a one-sentence description to each option of the "Style" question — Technical, Product, Balanced — framed on one axis (technical precision ↔ user-oriented clarity), with Balanced as the midpoint
- [x] 1.2 In the `context` composition step, write the style as its name plus that one-line meaning instead of the bare name
- [x] 1.3 Keep the two texts identical in substance: what is offered at selection is what is persisted

## 2. Verify and build

- [x] 2.1 Run `bun run typecheck` to verify types
- [x] 2.2 Run `bun run build` to bundle
- [x] 2.3 Run `openspec validate clarify-balanced-writing-style --strict`
