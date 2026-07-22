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

export interface Scenario {
  name: string
  lines: string[] // raw body lines of the scenario (usually `- **WHEN** …` / `- **THEN** …` bullets)
}

export interface Requirement {
  name: string
  description: string // text between the `### Requirement:` header and the first scenario
  scenarios: Scenario[]
}

export interface OpenSpecSpec {
  name: string // capability directory name — stable id and the label shown in the list
  title: string // display title parsed from the `#` heading, or the dir name when absent
  description: string // paragraph between the title and the first `##` section
  purpose: string // text under `## Purpose`
  requirements: Requirement[]
}

export interface OpenSpecSummary {
  root: string // "openspec" or ".openspec" — the directory the data was read from
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

// A spec.md's title comes from its single `#` heading. openspec writes "# <Name> Specification"
// when archiving, and authors commonly write "# Specification: <Name>"; strip whichever affix is
// present, otherwise fall back to the capability directory name.
function specTitle(heading: string, fallback: string): string {
  const t = heading.trim()
  const prefixed = /^Specification:\s*(.+)$/i.exec(t)
  if (prefixed) return prefixed[1].trim()
  const suffixed = /^(.+?)\s+Specification$/i.exec(t)
  if (suffixed) return suffixed[1].trim()
  return t || fallback
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === "") start++
  while (end > start && lines[end - 1].trim() === "") end--
  return lines.slice(start, end)
}

const SPEC_H1 = /^#\s+(.+?)\s*$/
const SPEC_H2 = /^##\s+(.+?)\s*$/
const SPEC_REQUIREMENT = /^###\s+Requirement:\s*(.+?)\s*$/i // mirrors openspec's MarkdownParser
const SPEC_SCENARIO = /^####\s+(.+?)\s*$/
const SPEC_FENCE = /^\s*(`{3,}|~{3,})/

// Parse a spec.md into title/description/purpose plus the requirements-with-scenarios tree the
// sidebar drills into. Requirements are the `### Requirement:` headers inside the `## Requirements`
// section, each carrying its `#### Scenario:` children. Fenced code blocks are skipped so `#` lines
// inside them aren't mistaken for headings.
export function parseSpec(dirName: string, content: string): OpenSpecSpec {
  const lines = content.replace(/\r\n?/g, "\n").split("\n")

  let title = ""
  let sawTitle = false
  const descLines: string[] = []
  const purposeLines: string[] = []
  const requirements: Requirement[] = []

  let section: "head" | "purpose" | "requirements" | "other" = "head"
  let fence: string | null = null

  let req: Requirement | null = null
  let reqDesc: string[] = []
  let scenario: Scenario | null = null

  const collect = (line: string) => {
    if (section === "requirements") {
      if (scenario) scenario.lines.push(line)
      else if (req) reqDesc.push(line)
    } else if (section === "purpose") {
      purposeLines.push(line)
    } else if (section === "head" && sawTitle) {
      descLines.push(line)
    }
  }
  const closeScenario = () => {
    if (req && scenario) {
      scenario.lines = trimBlankEdges(scenario.lines)
      req.scenarios.push(scenario)
    }
    scenario = null
  }
  const closeReq = () => {
    closeScenario()
    if (req) {
      req.description = trimBlankEdges(reqDesc).join("\n")
      requirements.push(req)
    }
    req = null
    reqDesc = []
  }

  for (const raw of lines) {
    // Track fenced code blocks so `#`/`###` lines inside them aren't parsed as structure.
    const fenceMatch = SPEC_FENCE.exec(raw)
    if (fence !== null) {
      if (fenceMatch && raw.trim().startsWith(fence)) fence = null
      collect(raw)
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      collect(raw)
      continue
    }

    const h2 = SPEC_H2.exec(raw)
    if (h2) {
      closeReq() // leaving whatever section we were in also closes any open requirement
      const label = h2[1].trim()
      section = /^Purpose$/i.test(label) ? "purpose" : /^Requirements$/i.test(label) ? "requirements" : "other"
      continue
    }

    if (section === "requirements") {
      const reqMatch = SPEC_REQUIREMENT.exec(raw)
      if (reqMatch) {
        closeReq()
        req = { name: reqMatch[1].trim(), description: "", scenarios: [] }
        continue
      }
      const scMatch = req && SPEC_SCENARIO.exec(raw)
      if (scMatch) {
        closeScenario()
        const label = scMatch[1].trim()
        const named = /^Scenario:\s*(.+)$/i.exec(label) // strip the "Scenario:" affix for display
        scenario = { name: (named ? named[1] : label).trim(), lines: [] }
        continue
      }
      collect(raw)
      continue
    }

    if (section === "head" && !sawTitle) {
      const h1 = SPEC_H1.exec(raw)
      if (h1) {
        title = specTitle(h1[1], dirName)
        sawTitle = true
        continue
      }
    }
    collect(raw)
  }
  closeReq()

  return {
    name: dirName,
    title: title || dirName,
    description: trimBlankEdges(descLines).join("\n"),
    purpose: trimBlankEdges(purposeLines).join("\n"),
    requirements,
  }
}

async function listSubdirs(client: FileClient, path: string): Promise<string[]> {
  try {
    const entries = await client.list(path)
    return entries.filter((e) => e.type === "directory" && !e.name.startsWith(".")).map((e) => e.name)
  } catch {
    return []
  }
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

function specEquals(a: OpenSpecSpec, b: OpenSpecSpec): boolean {
  return (
    a.name === b.name &&
    a.title === b.title &&
    a.description === b.description &&
    a.purpose === b.purpose &&
    a.requirements.length === b.requirements.length &&
    a.requirements.every((r, i) => {
      const o = b.requirements[i]
      return (
        r.name === o.name &&
        r.description === o.description &&
        r.scenarios.length === o.scenarios.length &&
        r.scenarios.every((s, j) => {
          const os = o.scenarios[j]
          return s.name === os.name && s.lines.length === os.lines.length && s.lines.every((l, k) => l === os.lines[k])
        })
      )
    })
  )
}

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
