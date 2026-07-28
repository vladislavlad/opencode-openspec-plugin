## Context

`readOpenSpec` already parses each `spec.md` entirely into `OpenSpecSpec` (title, purpose, requirements → scenarios → lines) and holds the result in a `summary` signal polled every 3 seconds. So all text worth searching is already in memory – search requires no filesystem access, no agent turn, no CLI.

The only open question was: can the plugin accept keyboard input in the sidebar. `@opentui/solid` provides an `<input>` intrinsic (`InputRenderable`), focus in opentui is exclusive at the renderer level – `focusRenderable()` blurs the previous focus. So the field can take input away from the opencode prompt, and the task is to correctly return focus back.

## Goals / Non-Goals

**Goals:**
- Search across all spec artifacts, not just by name.
- Mouse input: click on field → cursor → typing, no hotkeys.
- Return keyboard focus to the opencode prompt after Esc/Enter – user shouldn't get "stuck" in the field.

**Non-Goals:**
- Fuzzy search and ranking.
- Search across changes/tasks.
- Persist query between sessions.

## Decisions

### Matching: AND tokens against one "haystack"
A specification is concatenated into a single lowercase text from all artifacts (name, title, purpose + for each requirement name, description, scenario names and lines), cleaned of schema syntax. The query is split on spaces into tokens; a spec matches if every token is found as a substring. Tokens may match in different places – that's what users expect from a search bar ("archive tasks" finds a spec where one word is in Purpose, another in a scenario).

**Considered alternatives:** Fuzzy (subsequence) – noisy on short queries and requires ranking. Strict name-only search – doesn't solve the original problem.

### Schema keywords are syntax, not content
`SHALL`, `WHEN`, `THEN` and markup `- **…**` appear in every spec, so as a search condition they're useless: query `shall` returned 9 of 9 specs, `when` – all too. Remove them from matching – both from the query and from indexed text. Storage is untouched: `spec.md` remains a markdown file, requirements and scenarios are stored as written.

The cleaning function lives in the schema module: keyword list is its knowledge, not search's knowledge. A query that becomes empty after cleaning differs from an empty one: empty doesn't filter at all, while "shall" finds nothing – otherwise it would silently show the entire list.

**Considered alternatives:** split text into fields during parsing (`subject`/`shall`, steps `keyword`/`text`) – works but imposes a rigid structure on a markdown file for the same effect, and breaks on requirements with two SHALLs, `MUST` instead of `SHALL`, and headings without the `Requirement:` prefix – all allowed by the schema.

### Schema-specific code lives in its own module
`spec-driven.ts` is the only place that knows about `### Requirement:`, SHALL, and WHEN/THEN: model, parser, and `stripSyntax`. `openspec.ts` keeps what's schema-independent – directory traversal, tasks, summary assembly.

### Matched requirement count in row
`searchSpecs` returns not just specifications but also the number of requirements whose own text matched the query. When it's > 0, `SpecRow` prints `N matching requirements` – user sees that the match is internal, not in the title. When 0 (only spec-level matched) – regular `N requirements`.

### Focus return via `renderer.currentFocusedRenderable`
Before focusing, `SearchField` remembers `api.renderer.currentFocusedRenderable` (the opencode prompt) and calls its `focus()` on blur. So Esc/Enter returns the keyboard to chat without a mouse click. The same call fires from `onCleanup`, so collapsing the section or navigating to detail-view doesn't leave focus hanging on an unmounted field.

**Considered alternatives:** plain `blur()` without restoration – focus goes to null, and the prompt must be revived with a mouse click. Own keymap registration via `api.keymap` – excessive for one field.

### Focus state from renderer, not own signal
Clicking the opencode prompt moves focus past us: the renderer blurs our input, but the component doesn't learn about it. Its own flag stays `true` – the field keeps highlighting, and the next click on it does nothing because "we're already focused." So the component holds a `ref` to `InputRenderable`, subscribes to the renderer event `focused_renderable`, and syncs its signal with the actual focus owner; focus/blur are called imperatively through ref, not via reactive prop `focused`.

### Non-blinking cursor
`EditBufferRenderable.renderCursor` re-sends `setCursorStyle` on every redraw, and the terminal restarts the blinking phase for each such call. In sidebar redrawing happens frequently (row hover, poll tick every 3 seconds), so the cursor effectively stays solid and jitters. Set `cursorStyle={{ blinking: false }}` – predictable steady cursor instead of random blinking.

### `<input>` as controlled component
`InputRenderable.set value` compares with its current text and silently exits on equality, so two-way binding `value={query()}` + `onInput={setQuery}` doesn't jerk the cursor on every keystroke but allows programmatic field clearing (the "✕" button).

### Esc via `onKeyDown`
`InputRenderable` doesn't know about Esc (its keybindings only cover submit/navigation), so we attach `onKeyDown` to the input itself: on `escape` – `preventDefault()`, `stopPropagation()` and blur. Enter arrives as `onSubmit`. Input doesn't conflict with global opencode binds: `InputRenderable` inherits `EditBufferRenderable`, meaning it becomes `currentFocusedEditor` on focus, and the host doesn't intercept individual keys.

### Filtering in sidebar, not section component
`createMemo` in `sidebar.tsx` computes `searchSpecs(specs, query)`; `CollapsibleSection` receives result length, list gets filtered rows. The section stays "dumb," and the memo only recomputes on query or data change (signal `summary` is compared via `summaryEquals`, so polling every 3 seconds doesn't cause extra recalculations).

## Risks / Trade-offs

- **Focus in terminal.** If the host ever starts restoring focus to the prompt itself, our `previous.focus()` becomes redundant but harmless: `focus()` is a no-op for already-focused elements.
- **Empty result hides everything.** Mitigated by explicit "No matches" and always-visible "✕".
