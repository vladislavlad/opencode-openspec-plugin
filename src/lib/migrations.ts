import { semverGt } from "./updates"

// One release's post-update payload:
// - `instructions`: steps for the AGENT to run after the update (config-schema change, moved files,
//   …). May be empty when a release needs nothing done.
// - `releaseNotes`: what changed in this version, for the agent to relay to the USER. May be empty.
export interface Migration {
  instructions: string
  releaseNotes: string
}

// Keyed by the plugin version that introduces them. After the plugin is updated and opencode
// restarts, Complete Update replays every entry in the crossed range as one prompt. Empty until the
// first release that needs a migration or has notes worth surfacing.
export const MIGRATIONS: Record<string, Migration> = {
  // "0.3.0": {
  //   instructions: "Rename `openspec/config.yaml` key `foo` to `bar`.",
  //   releaseNotes: "Added a version-tracking panel and one-click updates.",
  // },
}

// Migrations whose version is in (old, new], ordered oldest → newest, tagged with their version.
export function collectMigrations(old: string, next: string): (Migration & { version: string })[] {
  return Object.keys(MIGRATIONS)
    .filter((v) => semverGt(v, old) && !semverGt(v, next)) // old < v <= next
    .sort((a, b) => (semverGt(a, b) ? 1 : -1))
    .map((v) => ({ version: v, ...MIGRATIONS[v] }))
}

// The prompt Complete Update sends: the agent runs any migration instructions, then tells the user
// what's new from the release notes, then clears the update-in-progress flag.
export function buildMigrationPrompt(range: { old: string; new: string }): string {
  const migrations = collectMigrations(range.old, range.new)
  const lines = [`The OpenSpec plugin was updated from ${range.old} to ${range.new} and opencode has restarted.`, ""]

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

  lines.push(
    "When done, remove the `plugin.update-in-progress` block from `openspec/config.yaml`, keeping the rest of the file (schema, context, rules) intact.",
  )
  return lines.join("\n")
}
