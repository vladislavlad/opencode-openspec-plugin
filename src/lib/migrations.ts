import { SPEAK_THE_USER_LANGUAGE } from "./prompt-style"
import { semverGt } from "./updates"

export interface Migration {
  instructions: string // post-update steps for the agent; empty when a release needs nothing done
  releaseNotes: string // what changed, for the agent to relay to the user
}

// Keyed by the plugin version that introduces them. After the update and a restart, Complete Update
// replays every entry in the crossed range as one prompt.
//
// Writing releaseNotes: highlights only – what the user can now DO that they couldn't before, one
// short sentence each, 3-5 per release. Name the thing and where it is ("a search field above the
// Specifications list"), not how it was built. Leave out refactors, internal moves, cosmetic fixes
// and anything invisible from the sidebar; if a bug fix isn't one the user hit, it isn't a highlight.
// One entry per released version – collapse the work of several changes into it, don't list them.
export const MIGRATIONS: Record<string, Migration> = {
  "0.3.0": {
    instructions: "",
    releaseNotes: [
      "Release notes now reach you however you updated.",
      "Search your specs: a field above the Specifications list filters by name, Purpose, requirements and scenarios.",
      "Init process shows its progress – specs appear in the sidebar as they are derived.",
      "Interrupted setup offers Resume and continues from where it stopped.",
      "Setup asks its questions in your language, and asks up front how deeply to study the project.",
    ].join(" "),
  },
  "0.3.1": {
    instructions: "",
    releaseNotes: [
      "A change now opens as three sections – Proposal, Design and Tasks.",
      "Proposal shows proposal.md with Why, What Changes and other sections.",
      "Design shows design.md for changes that have one.",
      "Tasks carries the task count in its header, and group titles now hang to the left of their tasks.",
      "The Delete button in Active Change is now blocked while the agent is busy.",
    ].join(" "),
  },
  "0.3.2": {
    instructions: "",
    releaseNotes: [
      "Check Versions and Reload buttons in Settings are now blocked while the agent is busy.",
      "Update prompts no longer leak internal cleanup instructions into release notes shown to you.",
      "The post-update banner now has a clickable Reopen OpenCode button when the new build hasn't loaded yet.",
      "The Settings reload button is now labeled Reload OpenCode to match other restart buttons in the sidebar.",
    ].join(" "),
  }
}

// Migrations whose version is in (old, new], ordered oldest → newest, tagged with their version.
export function collectMigrations(old: string, next: string): (Migration & { version: string })[] {
  return Object.keys(MIGRATIONS)
    .filter((v) => semverGt(v, old) && !semverGt(v, next)) // old < v <= next
    .sort((a, b) => (semverGt(a, b) ? 1 : -1))
    .map((v) => ({ version: v, ...MIGRATIONS[v] }))
}

// Whether a range is worth surfacing at all – a patch release with no entry has nothing to say.
export const hasMigrations = (old: string, next: string) => collectMigrations(old, next).length > 0

// Complete Update: agent actions first (migration steps, clear flag), then relayable content
// (release notes). Each stage is delimited by `---` so the agent distinguishes private actions
// from content to relay. `clearFlag` adds the instruction to drop `plugin.update-in-progress`;
// a range detected from `kv` has no flag to drop.
export function buildMigrationPrompt(range: { old: string; new: string }, opts: { clearFlag?: boolean } = {}): string {
  const migrations = collectMigrations(range.old, range.new)

  // Stage 1: Context — version range + restart notice
  const lines = [
    SPEAK_THE_USER_LANGUAGE,
    "",
    `The OpenSpec plugin was updated from ${range.old} to ${range.new} and opencode has restarted.`,
    `You should do after-update actions. Actions separated by "---".`,
  ]

  // Stage 2: Migration steps — agent action, execute silently (only when there are steps)
  const steps = migrations.filter((m) => m.instructions.trim())
  if (steps.length) {
    lines.push("---", "", "Execute these migration steps in order:", "")
    for (const m of steps) lines.push(`### ${m.version}`, m.instructions, "")
  }

  // Stage 3: Clear flag — agent action, execute silently
  if (opts.clearFlag) {
    lines.push("---", "", "Remove the `plugin.update-in-progress` block from `openspec/config.yaml` in project, keeping the rest of the file (schema, context, rules) intact.")
  }

  // Stage 4: Release notes — relayable content, summarize for the user
  const notes = migrations.filter((m) => m.releaseNotes.trim())
  if (notes.length) {
    lines.push("---", "", "Write for the user these release notes grouped by version in language of the user in pretty format:", "")
    for (const m of notes) lines.push(`### ${m.version}`, m.releaseNotes, "")
  }

  return lines.join("\n")
}
