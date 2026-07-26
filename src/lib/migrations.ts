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
  "0.2.2": {
    instructions: "",
    releaseNotes:
      "The Specifications section now has a search field above the list. Click it and type to filter specs — the query matches every artifact of a spec: its name, title, Purpose, and the names, descriptions and scenarios of its requirements. Multi-word queries match all words. The same field sits inside a spec, above its requirements: the query carries over when you open a spec, filters its requirements and scenarios, and is still there when you go back. Esc or Enter returns keyboard focus to the prompt, and ✕ clears the query. The spec detail view also drops its title line — it only repeated the capability name — and the free text above the first section, which is not part of the OpenSpec spec format. Divider lines now match the sidebar width instead of wrapping onto a second row, which removes a stray blank line under every separator in a narrow sidebar. Schema keywords and markdown are ignored while matching, so searching for \"shall\", \"when\" or \"**\" no longer returns every spec in the project.",
  },
  "0.3.0": {
    instructions: "",
    releaseNotes: [
      "The sidebar no longer goes blank during setup. Specs now appear in the list as they are derived, with a status line showing the current stage (installing, configuring, deriving specs, validating).",
      "A project counts as initialised right after `openspec init`, so the Init button no longer comes back when no specs were derived (e.g. in an empty project).",
      "Setup now records its progress in `openspec/config.yaml` under `plugin.init`, stage by stage. If it is interrupted, the sidebar says where it stopped and offers Resume — which picks up from the first unfinished stage instead of starting over — or Dismiss, which clears the marker.",
      "The restart prompt is now one message — \"Reload opencode to activate new commands and skills\" with a Reload OpenCode button — instead of two differently worded ones, and it is held back until setup is finished or dismissed, so it no longer competes with Resume.",
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
