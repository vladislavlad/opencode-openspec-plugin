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

export interface OpenSpecItem {
  name: string
  requirements: number
}

export interface OpenSpecSummary {
  specCount: number
  requirementCount: number
  specs: OpenSpecItem[]
  changes: OpenSpecChange[]
}

export interface FileClient {
  list(path: string): Promise<{ name: string; type: "file" | "directory" }[]>
  read(path: string): Promise<string>
}

// Checkbox anchor mirrors @fission-ai/openspec countTasksFromContent (`/^[-*]\s+\[[\sx]\]/i`).
const TASK_LINE = /^[-*]\s+\[([\sxX])\]\s?(.*)$/
const HEADING_LINE = /^#{1,6}\s+(.*)$/

function parseTasks(content: string): { total: number; completed: number; groups: TaskGroup[] } {
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

// Requirements = `###` headers under the `## Requirements` section, matching openspec's MarkdownParser.
function countRequirements(content: string): number {
  let count = 0
  let inRequirements = false
  for (const line of content.split("\n")) {
    const heading = /^##\s+(.+)/.exec(line)
    if (heading) {
      inRequirements = /^requirements\b/i.test(heading[1].trim())
      continue
    }
    if (inRequirements && /^###\s+/.test(line)) count++
  }
  return count
}

async function listSubdirs(client: FileClient, path: string): Promise<string[]> {
  try {
    const entries = await client.list(path)
    return entries.filter((e) => e.type === "directory" && !e.name.startsWith(".")).map((e) => e.name)
  } catch {
    return []
  }
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
    a.specs.every((s, i) => s.name === b.specs[i].name && s.requirements === b.specs[i].requirements)
  )
}

export async function readOpenSpec(client: FileClient): Promise<OpenSpecSummary | null> {
  let rootName: string | null = null
  for (const candidate of ["openspec", ".openspec"]) {
    // Missing dir lists as empty (server 500 is swallowed), so `> 0` is the real presence check.
    if ((await listSubdirs(client, candidate)).length > 0) {
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

  const specs: OpenSpecItem[] = []
  for (const name of await listSubdirs(client, `${rootName}/specs`)) {
    const content = await client.read(`${rootName}/specs/${name}/spec.md`)
    if (!content) continue // openspec counts a spec only when its spec.md exists
    specs.push({ name, requirements: countRequirements(content) })
  }
  specs.sort((a, b) => a.name.localeCompare(b.name))

  return {
    specCount: specs.length,
    requirementCount: specs.reduce((sum, s) => sum + s.requirements, 0),
    specs,
    changes,
  }
}
