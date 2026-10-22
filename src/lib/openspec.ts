// Reads the openspec directory: task counts, capability discovery and the summary the sidebar polls.
// The spec.md model and its parser live in `spec-driven.ts`.
import { parseSpec, specEquals } from "./spec-driven"
export { parseSpec } from "./spec-driven"
export type { OpenSpecSpec, Requirement, Scenario } from "./spec-driven"
import type { OpenSpecSpec } from "./spec-driven"

export interface Task {
  done: boolean
  text: string
  depth: number
  marker: string // original checkbox marker; only x/X means done
  number: string // ordered-list label (e.g. "1."); empty for unordered tasks
}

export interface TaskGroup {
  title: string // "" for tasks that appear before the first heading
  tasks: Task[]
}

export interface OpenSpecChange {
  name: string
  completedTasks: number
  totalTasks: number
  groups: TaskGroup[]
}

export interface OpenSpecSummary {
  specCount: number
  requirementCount: number
  specs: OpenSpecSpec[]
  changes: OpenSpecChange[]
}

export interface FileClient {
  list(path: string): Promise<{ name: string; type: "file" | "directory" }[]>
  read(path: string): Promise<string>
}

// Mirrors OpenSpec 1.14.3 parseTaskLines: nested/ordered list items and a padded single-character
// marker. Only x/X is done; links are excluded except for whitespace-only unfinished checkboxes.
// Keep the task matcher aligned with the CLI; line endings are normalized before matching.
const TASK_LINE = /^(\s*)([-*+]|\d{1,9}[.)])\s*\[(?:\s*([^\]\s]?)\s*\](?![([])|\s+\])\s*(.*)/
const HEADING_LINE = /^#{1,6}\s+(.*)$/

export function parseTasks(content: string): { total: number; completed: number; groups: TaskGroup[] } {
  let total = 0
  let completed = 0
  const groups: TaskGroup[] = []
  let current: TaskGroup | null = null
  const indents: number[] = []
  for (const raw of content.split(/\r?\n/)) {
    const task = TASK_LINE.exec(raw)
    if (task) {
      const marker = task[3] ?? ""
      const done = marker.toLowerCase() === "x"
      // Normalize each group's source indentation to levels; tabs advance to a four-column stop.
      let indent = 0
      for (const ch of task[1]) indent += ch === "\t" ? 4 - (indent % 4) : 1
      while (indents.length && indent < indents[indents.length - 1]) indents.pop()
      if (!indents.length || indent > indents[indents.length - 1]) indents.push(indent)
      total++
      if (done) completed++
      if (!current) groups.push((current = { title: "", tasks: [] }))
      current.tasks.push({ done, text: task[4].trim(), depth: indents.length - 1, marker, number: /^\d/.test(task[2]) ? task[2] : "" })
      continue
    }
    const heading = HEADING_LINE.exec(raw)
    if (heading) {
      groups.push((current = { title: heading[1].trim(), tasks: [] }))
      indents.length = 0
    }
  }
  return { total, completed, groups }
}

async function listEntries(client: FileClient, path: string): Promise<{ name: string; type: "file" | "directory" }[]> {
  try {
    return await client.list(path)
  } catch {
    return []
  }
}

const isSubdir = (e: { name: string; type: string }) => e.type === "directory" && !e.name.startsWith(".")

async function listSubdirs(client: FileClient, path: string): Promise<string[]> {
  return (await listEntries(client, path)).filter(isSubdir).map((e) => e.name)
}

// The CLI keeps everything under a single `openspec/` directory – its own path constant, no alternates.
export const ROOT = "openspec"

// `openspec init` writes config.yaml but no subdirs, so either one marks the directory as set up.
async function isRoot(client: FileClient, path: string): Promise<boolean> {
  const entries = await listEntries(client, path)
  return entries.some((e) => isSubdir(e) || (e.type === "file" && e.name === "config.yaml"))
}

// The commands and skills `openspec init --tools opencode` writes into `.opencode`.
export const OPSX_COMMANDS = ["opsx-apply", "opsx-archive", "opsx-explore", "opsx-propose", "opsx-sync", "opsx-update"]
const REQUIRED_SKILLS = [
  "openspec-apply-change",
  "openspec-archive-change",
  "openspec-explore",
  "openspec-propose",
  "openspec-sync-specs",
  "openspec-update-change",
]

// True only when every one of them is present.
export async function hasOpenSpecTooling(client: FileClient): Promise<boolean> {
  let commands: { name: string }[]
  try {
    commands = await client.list(".opencode/commands")
  } catch {
    return false
  }
  const commandNames = new Set(commands.map((e) => e.name))
  if (!OPSX_COMMANDS.every((c) => commandNames.has(`${c}.md`))) return false

  const skillNames = new Set(await listSubdirs(client, ".opencode/skills"))
  return REQUIRED_SKILLS.every((s) => skillNames.has(s))
}

export const isComplete = (change: OpenSpecChange) =>
  change.totalTasks > 0 && change.completedTasks === change.totalTasks

export const isGroupComplete = (group: TaskGroup) =>
  group.tasks.length > 0 && group.tasks.every((t) => t.done)

// Deep equality, so a poll that reads identical files doesn't re-render the tree.
export function summaryEquals(a: OpenSpecSummary | null, b: OpenSpecSummary | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.specCount === b.specCount &&
    a.requirementCount === b.requirementCount &&
    a.changes.length === b.changes.length &&
    a.specs.length === b.specs.length &&
    a.changes.every((c, i) => {
      const o = b.changes[i]
      return (
        c.name === o.name &&
        c.completedTasks === o.completedTasks &&
        c.totalTasks === o.totalTasks &&
        c.groups.length === o.groups.length &&
        c.groups.every((g, j) => {
          const og = o.groups[j]
          return (
            g.title === og.title &&
            g.tasks.length === og.tasks.length &&
            g.tasks.every((t, k) => {
              const other = og.tasks[k]
              return t.done === other.done && t.text === other.text && t.depth === other.depth && t.marker === other.marker && t.number === other.number
            })
          )
        })
      )
    }) &&
    a.specs.every((s, i) => specEquals(s, b.specs[i]))
  )
}

// Specs nest: `specs/<capability>/spec.md`, or `specs/<area>/<capability>/spec.md` when they're
// grouped. The CLI walks the same way and names a spec by its path from `specs/`, so `name` here is
// that same id – a directory holding spec.md is a capability, one holding only directories is an
// area. spec.md is read before the directory is listed, so a flat project costs what it always did;
// a missing file reads as "" (and a failing read is treated the same, since an area legitimately has
// none, and letting it throw would drop the whole summary on every poll).
async function readSpecsUnder(client: FileClient, path: string, name: string): Promise<OpenSpecSpec[]> {
  const content = await client.read(`${path}/spec.md`).catch(() => "")
  if (content) return [parseSpec(name, content)]
  const subdirs = await listSubdirs(client, path)
  const nested = await Promise.all(subdirs.map((sub) => readSpecsUnder(client, `${path}/${sub}`, `${name}/${sub}`)))
  return nested.flat()
}

export async function readOpenSpec(client: FileClient): Promise<OpenSpecSummary | null> {
  if (!(await isRoot(client, ROOT))) return null

  const [changeDirs, specDirs] = await Promise.all([
    listSubdirs(client, `${ROOT}/changes`),
    listSubdirs(client, `${ROOT}/specs`),
  ])

  // Reads run in parallel – this whole function re-runs on every poll.
  const changes = await Promise.all(
    changeDirs
      .filter((name) => name !== "archive")
      .map(async (name) => {
        const { total, completed, groups } = parseTasks(await client.read(`${ROOT}/changes/${name}/tasks.md`))
        return { name, totalTasks: total, completedTasks: completed, groups }
      }),
  )
  changes.sort((a, b) => a.name.localeCompare(b.name))

  const specs = (await Promise.all(specDirs.map((name) => readSpecsUnder(client, `${ROOT}/specs/${name}`, name)))).flat()
  specs.sort((a, b) => a.name.localeCompare(b.name))

  return {
    specCount: specs.length,
    requirementCount: specs.reduce((sum, s) => sum + s.requirements.length, 0),
    specs,
    changes,
  }
}
