## Context

The `MIGRATIONS` mechanism appeared alongside the update flow (`2026-07-25-version-tracking`) and is tied to exactly one trigger: the Update button asks the agent to write `plugin.update-in-progress` into config.yaml, after restart the sidebar sees the flag and offers Complete Update. Only this button writes the flag.

You can update past it in at least three ways, only one of which is manual: editing `tui.json` or `npm i -g`; a version-less specifier that opencode updates itself on next launch; reinstalling an environment. In all three cases there's no flag – meaning `instructions` don't execute and release notes are never seen by the user even though the plugin already behaves differently.

The plugin knows everything anyway: `VERSION` is baked into the build at `build.ts` time, and `TuiPluginApi.kv` survives restarts and wasn't used before. A comparison is enough to catch any update regardless of how it happened.

## Goals / Non-Goals

**Goals:**
- Release notes and `instructions` reach the user regardless of update method.
- No false positives: on first launch, rollback, and releases without entries – silence.
- Decision testable without a live TUI.

**Non-Goals:**
- Showing release notes retroactively to those who don't yet have entries in `kv`.
- Dismiss alongside Complete Update.
- Changes to npm version checks and update buttons – only what happens **after** a new build has loaded is changed.
- Storing CLI version in `kv`: it's read from `generatedBy` on disk and doesn't participate in plugin migrations.

## Decisions

### Source is `kv`, not `meta.state`, and that's intentional

The `tui` function receives as its third argument `meta` with field `state: "first" | "updated" | "same"` – opencode itself reports that the plugin updated. We found this out **after** implementing `kv`, and still kept `kv`.

Reason: `meta` doesn't carry the **previous** version. Without it, you can't assemble a range `(old, new]`, and without a range there's nothing to play – which exact release notes to show is unknown. That is, `meta.state` doesn't replace `kv`, but at best complements it as a second signal "an update happened".

Verified on a live plugin: rebuild dist → `state: "updated"`, restart without changes → `"same"`, `source: "file"` for dev checkout. Works as stated, but for file source `"updated"` fires on every rebuild (mtime is in the `fingerprint`), so without filtering by `source` it's noise. Recorded in TODO as a possible enhancement, not a replacement.

**Considered alternatives:** storing `old` in config.yaml instead of `kv` – but then updates in projects without openspec can't be tracked, and plugin version is global, not per-project.

### `kv` persistence verified separately

The only thing you can't close with a unit test: does `kv` survive restarts. Verified with a temporary debug log – two consecutive launches, the second read the version written by the first. Lives in `~/.local/state/opencode/kv.json` as plain JSON, globally (not per-project), keys aren't auto-namespaced – opencode's own settings are nearby, so the `openspec.` prefix is mandatory.

### Two sources, flag takes priority

Flag and version drift fold into one "pending range", single UI. Priority goes to the flag: it alone knows the exact version you left from, while `kv` only knows the last launched. The "Reopen opencode to finish updating" branch stays with the flag only – `kv` doesn't produce such a state by construction; drift is visible only when a new build has already loaded.

### While an update is in flight, version isn't recorded

If the flag is present, the decision never returns "record version". Otherwise the stamp in `kv` would overwrite `old` before migration runs, and the range would be lost irretrievably. Recording happens on Complete Update turn completion, by the same busy→idle transition that already tracks setup end and restart invitation.

### No entry in `kv` → stay silent

First launch of a build with this mechanism doesn't know where the user came from. Any range here would be made up, and dumping all release notes is the worst first experience. Record version silently.

Same for rollback (migrations apply forward only) and ranges without `MIGRATIONS` entries: on a patch release without notes there's nothing to show. For the flag path this rule doesn't apply – there the user pressed Update themselves and expects confirmation.

### Decision is a pure function, not logic inside a component

Initially the decision lived in sidebar signals, and could only be tested with a live TUI. You also can't manually inject a value into `kv` for a test stand – at the time of the decision we didn't know where it lives.

Moved to `decideMigration({ flag, last, current, hasEntries })` outside Solid. A table test covers the entire matrix: two sources × (first launch / match / growth / rollback / range without entries). The path through the Update button became a row of the same table rather than a separate manual check.

`current` is passed as a parameter rather than taken from `VERSION`: in a dev checkout, `VERSION` equals `"dev"`, and without a parameter you can't test the version growth branch at all.

`hasEntries` is also passed as a parameter rather than imported inside. Otherwise the test rides on `MIGRATIONS` content that changes every release and would break from key renaming.

### Dismiss isn't added

A second exit path means its own state and a branch "what if there's also a flag in config.yaml, should we remove it too?". The cost of pressing Complete Update is one cheap agent turn. If the banner turns out intrusive, we'll add it separately.

## Risks / Trade-offs

- **`instructions` still haven't executed once.** The field has existed since `MIGRATIONS` was introduced, but all entries have an empty string. This change expands mechanism coverage but doesn't test its instruction branch – the first real migration will be the first test of it.
- **The `kv` banner shows until Complete Update is pressed.** Without Dismiss there's no other way out. Considered acceptable: it appears once per version change, and range accumulation is correct – missed notes aren't lost.
- **dev checkout stays silent by construction** (`VERSION === "dev"`), so the `kv` branch isn't tested live during development – only by tests and on a real release.
