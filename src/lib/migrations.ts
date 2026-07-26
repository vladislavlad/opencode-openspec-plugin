import { SPEAK_THE_USER_LANGUAGE } from "./prompt-style"
import { semverGt } from "./updates"

export interface Migration {
  instructions: string // post-update steps for the agent; empty when a release needs nothing done
  releaseNotes: string // what changed, for the agent to relay to the user
}

// Keyed by the plugin version that introduces them. After the update and a restart, Complete Update
// replays every entry in the crossed range as one prompt.
//
// Writing releaseNotes: highlights only — what the user can now DO that they couldn't before, one
// short sentence each, 3-5 per release. Name the thing and where it is ("a search field above the
// Specifications list"), not how it was built. Leave out refactors, internal moves, cosmetic fixes
// and anything invisible from the sidebar; if a bug fix isn't one the user hit, it isn't a highlight.
// One entry per released version — collapse the work of several changes into it, don't list them.
export const MIGRATIONS: Record<string, Migration> = {
  "0.3.0": {
    instructions: "",
    releaseNotes: [
      "Release notes now reach you however you updated.",
      "Search your specs: a field above the Specifications list filters by name, Purpose, requirements and scenarios.",
      "Init process shows its progress — specs appear in the sidebar as they are derived.",
      "Interrupted setup offers Resume and continues from where it stopped.",
      "Setup asks its questions in your language, and asks up front how deeply to study the project.",
    ].join(" "),
  },
}

// Migrations whose version is in (old, new], ordered oldest → newest, tagged with their version.
export function collectMigrations(old: string, next: string): (Migration & { version: string })[] {
  return Object.keys(MIGRATIONS)
    .filter((v) => semverGt(v, old) && !semverGt(v, next)) // old < v <= next
    .sort((a, b) => (semverGt(a, b) ? 1 : -1))
    .map((v) => ({ version: v, ...MIGRATIONS[v] }))
}

// Whether a range is worth surfacing at all — a patch release with no entry has nothing to say.
export const hasMigrations = (old: string, next: string) => collectMigrations(old, next).length > 0

// Complete Update: run the migration steps, then relay the release notes. `clearFlag` adds the
// instruction to drop `plugin.update-in-progress`; a range detected from `kv` has no flag to drop.
export function buildMigrationPrompt(range: { old: string; new: string }, opts: { clearFlag?: boolean } = {}): string {
  const migrations = collectMigrations(range.old, range.new)
  const lines = [
    SPEAK_THE_USER_LANGUAGE,
    "",
    `The OpenSpec plugin was updated from ${range.old} to ${range.new} and opencode has restarted.`,
    "",
  ]

  const steps = migrations.filter((m) => m.instructions.trim())
  if (steps.length) {
    lines.push("Apply these migration steps in order:", "")
    for (const m of steps) lines.push(`### ${m.version}`, m.instructions, "")
  } else {
    lines.push("There are no migration steps for this version range.", "")
  }

  const notes = migrations.filter((m) => m.releaseNotes.trim())
  if (notes.length) {
    lines.push("Then tell me what's new — summarize these release notes for the user, grouped by version:", "")
    for (const m of notes) lines.push(`### ${m.version}`, m.releaseNotes, "")
  }

  if (opts.clearFlag) {
    lines.push(
      "When done, remove the `plugin.update-in-progress` block from `openspec/config.yaml`, keeping the rest of the file (schema, context, rules) intact.",
    )
  }
  return lines.join("\n")
}
