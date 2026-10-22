## 1. Create directory structure and barrel skeleton

- [x] 1.1 Create `src/components/primitives/` directory
- [x] 1.2 Create empty `index.ts` with placeholder re-exports for all current exports from `primitives.tsx`

## 2. Extract types and hover helper

- [x] 2.1 Create `gate.ts` — move `Gate` type (line 5)
- [x] 2.2 Create `hover.ts` — move `HoverState` type + `rowHover()` function (lines 8-21); import from `./gate` if needed
- [x] 2.3 Update barrel to re-export from `./gate` and `./hover`

## 3. Extract Button component

- [x] 3.1 Create `button.ts` — move `Button` component (lines 44-68); import `Theme`, `Color` from `../lib/theme`
- [x] 3.2 Update barrel to re-export from `./button`

## 4. Extract BackButton and ClearButton

- [x] 4.1 Create `buttons.ts` — move `BackButton` (lines 77-79) and `ClearButton` (lines 82-97); import `{ Button } from "./button"`
- [x] 4.2 Update barrel to re-export from `./buttons`

## 5. Extract layout components

- [x] 5.1 Create `layout.ts` — move `ProgressBar` (lines 24-39), `Divider` (lines 73-75), `CollapsibleSection` (lines 254-291); import `{ Button } from "./button"` if CollapsibleSection needs it
- [x] 5.2 Update barrel to re-export from `./layout`

## 6. Extract DetailHeader

- [x] 6.1 Create `detail.ts` — move `DetailHeader` (lines 100-113); import `{ BackButton } from "./buttons"` and `{ Divider } from "./layout"`
- [x] 6.2 Update barrel to re-export from `./detail`

## 7. Extract Paragraph and text helpers

- [x] 7.1 Create `paragraph.ts` — move `stripBold`, `splitShall`, `Paragraph` (lines 116-156)
- [x] 7.2 Update barrel to re-export from `./paragraph`

## 8. Extract Markdown and block parser

- [x] 8.1 Create `markdown.ts` — move regex constants, `mdBlocks`, `Markdown` (lines 158-250); import `{ Paragraph } from "./paragraph"`
- [x] 8.2 Update barrel to re-export from `./markdown`

## 9. Extract NotInitialised

- [x] 9.1 Create `init.ts` — move `NotInitialised` (lines 294-308); import `{ Button } from "./button"` and `{ Gate } from "./gate"`
- [x] 9.2 Update barrel to re-export from `./init`

## 10. Finalize and verify

- [x] 10.1 Delete `src/components/primitives.tsx`
- [x] 10.2 Run `bun run lint`, `bun run typecheck`, `bun run build` — fix any resolution or import issues
- [x] 10.3 Verify sidebar renders correctly (all imports resolve through barrel)
