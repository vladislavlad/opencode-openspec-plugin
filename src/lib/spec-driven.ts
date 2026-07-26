// The `spec-driven` schema (openspec/config.yaml → `schema:`): `## Purpose` / `## Requirements`,
// `### Requirement:` headers with a SHALL clause, `#### Scenario:` bodies of `- **WHEN** …` bullets.
// Another schema gets its own module — keep the syntax knowledge here.

export interface Scenario {
  name: string
  lines: string[] // raw body lines, usually `- **WHEN** …` / `- **THEN** …` bullets
}

export interface Requirement {
  name: string
  description: string // text between the `### Requirement:` header and the first scenario
  scenarios: Scenario[]
}

export interface OpenSpecSpec {
  name: string // capability directory name - stable id and the label shown in the list
  title: string // from the `#` heading, or the dir name; searchable, not rendered
  purpose: string // text under `## Purpose`
  requirements: Requirement[]
}

const SPEC_H1 = /^#\s+(.+?)\s*$/
const SPEC_H2 = /^##\s+(.+?)\s*$/
const SPEC_REQUIREMENT = /^###\s+Requirement:\s*(.+?)\s*$/i // mirrors openspec's MarkdownParser
const SPEC_SCENARIO = /^####\s+(.+?)\s*$/
const SPEC_FENCE = /^\s*(`{3,}|~{3,})/
// The schema's own vocabulary. Normative keywords per the openspec validator (SHALL or MUST), plus
// the scenario step keywords — every spec has them, so they carry no meaning as a search term.
const SYNTAX = /\b(SHALL|MUST|WHEN|THEN|GIVEN|AND|BUT)\b|[*_`]+|^[-+]\s+/gim

// Text as prose: no schema keywords, no markdown. For matching, never for display.
export function stripSyntax(text: string): string {
  return text.replace(SYNTAX, " ")
}

// "# <Name> Specification" (what openspec writes when archiving) and "# Specification: <Name>" both
// carry the name; fall back to the capability directory.
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

// Requirements are the `### Requirement:` headers inside `## Requirements`, each carrying its
// `#### Scenario:` children. Fenced blocks are skipped so `#` lines inside them aren't structure.
export function parseSpec(dirName: string, content: string): OpenSpecSpec {
  const lines = content.replace(/\r\n?/g, "\n").split("\n")

  let title = ""
  let sawTitle = false
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
      closeReq() // leaving a section also closes any open requirement
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
    purpose: trimBlankEdges(purposeLines).join("\n"),
    requirements,
  }
}

export function specEquals(a: OpenSpecSpec, b: OpenSpecSpec): boolean {
  return (
    a.name === b.name &&
    a.title === b.title &&
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
