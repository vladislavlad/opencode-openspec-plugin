// Reading the openspec directory: task counts, capability discovery and the summary the sidebar
// polls. The spec.md model and its parser live in `spec-driven.ts` — they belong to that schema,
// this file only reads files and assembles the summary.
import { parseSpec, specEquals } from "./spec-driven"
export { parseSpec } from "./spec-driven"
export type { OpenSpecSpec, Requirement, Scenario } from "./spec-driven"
import type { OpenSpecSpec } from "./spec-driven"

export interface Task {
  done: boolean
  text: string
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
  root: string // "openspec" or ".openspec" - the directory the data was read from
  specCount: number
  requirementCount: number
  specs: OpenSpecSpec[]
  changes: OpenSpecChange[]
}

export interface FileClient {
  list(path: string): Promise<{ name: string; type: "file" | "directory" }[]>
  read(path: string): Promise<string>
}

// Checkbox anchor mirrors @fission-ai/openspec countTasksFromContent (`/^[-*]\s+\[[\sx]\]/i`).
const TASK_LINE = /^[-*]\s+\[([\sxX])\]\s?(.*)$/
const HEADING_LINE = /^#{1,6}\s+(.*)$/

export function parseTasks(content: string): { total: number; completed: number; groups: TaskGroup[] } {
  let total = 0
  let completed = 0
  const groups: TaskGroup[] = []
  let current: TaskGroup | null = null
  for (const raw of content.split("\n")) {
    const task = TASK_LINE.exec(raw)
    if (task) {
      const done = task[1].toLowerCase() === "x"
      total++
      if (done) completed++
      if (!current) groups.push((current = { title: "", tasks: [] }))
      current.tasks.push({ done, text: task[2].trim() })
      continue
    }
    const heading = HEADING_LINE.exec(raw)
    if (heading) groups.push((current = { title: heading[1].trim(), tasks: [] }))
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

// `openspec init` writes config.yaml but no subdirs, so either one marks the root.
async function isRoot(client: FileClient, path: string): Promise<boolean> {
  const entries = await listEntries(client, path)
  return entries.some((e) => isSubdir(e) || (e.type === "file" && e.name === "config.yaml"))
}

// The command/skill files `openspec init --tools opencode` writes into `.opencode`.
const REQUIRED_COMMANDS = [
  "opsx-apply.md",
  "opsx-archive.md",
  "opsx-explore.md",
  "opsx-propose.md",
  "opsx-sync.md",
  "opsx-update.md",
]
const REQUIRED_SKILLS = [
  "openspec-apply-change",
  "openspec-archive-change",
  "openspec-explore",
  "openspec-propose",
  "openspec-sync-specs",
  "openspec-update-change",
]

// True only when every opencode command and skill from `openspec init` is present.
export async function hasOpenSpecTooling(client: FileClient): Promise<boolean> {
  let commands: { name: string }[]
  try {
    commands = await client.list(".opencode/commands")
  } catch {
    return false
  }
  const commandNames = new Set(commands.map((e) => e.name))
  if (!REQUIRED_COMMANDS.every((c) => commandNames.has(c))) return false

  const skillNames = new Set(await listSubdirs(client, ".opencode/skills"))
  return REQUIRED_SKILLS.every((s) => skillNames.has(s))
}

export const isComplete = (change: OpenSpecChange) =>
  change.totalTasks > 0 && change.completedTasks === change.totalTasks

export const isGroupComplete = (group: TaskGroup) =>
  group.tasks.length > 0 && group.tasks.every((t) => t.done)

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
            g.tasks.every((t, k) => t.done === og.tasks[k].done && t.text === og.tasks[k].text)
          )
        })
      )
    }) &&
    a.specs.every((s, i) => specEquals(s, b.specs[i]))
  )
}

export async function readOpenSpec(client: FileClient): Promise<OpenSpecSummary | null> {
  let rootName: string | null = null
  for (const candidate of ["openspec", ".openspec"]) {
    if (await isRoot(client, candidate)) {
      rootName = candidate
      break
    }
  }
  if (!rootName) return null

  const changes: OpenSpecChange[] = []
  for (const name of await listSubdirs(client, `${rootName}/changes`)) {
    if (name === "archive") continue
    const { total, completed, groups } = parseTasks(await client.read(`${rootName}/changes/${name}/tasks.md`))
    changes.push({ name, totalTasks: total, completedTasks: completed, groups })
  }
  changes.sort((a, b) => a.name.localeCompare(b.name))

  const specs: OpenSpecSpec[] = []
  for (const name of await listSubdirs(client, `${rootName}/specs`)) {
    const content = await client.read(`${rootName}/specs/${name}/spec.md`)
    if (!content) continue // openspec counts a spec only when its spec.md exists
    specs.push(parseSpec(name, content))
  }
  specs.sort((a, b) => a.name.localeCompare(b.name))

  return {
    root: rootName,
    specCount: specs.length,
    requirementCount: specs.reduce((sum, s) => sum + s.requirements.length, 0),
    specs,
    changes,
  }
}
