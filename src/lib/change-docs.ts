// The markdown a change carries next to tasks.md: proposal.md and design.md. Only structure lives
// here – `##` sections and a teaser. The spec-driven schema (`### Requirement:` and friends) is
// `spec-driven.ts`; a proposal has nothing to do with it.
import { ROOT, type FileClient } from "./openspec"

const SECTION = /^##\s+(.+?)\s*$/
const FENCE = /^\s*(`{3,}|~{3,})/

export interface DocSection {
  name: string
  body: string
}

// Raw file contents; null means the file isn't there (or couldn't be read, which we treat the same).
export interface ChangeArtifacts {
  proposal: string | null
  design: string | null
}

// One titled block of the Proposal section: a `##` section of proposal.md.
export interface DocPart {
  label: string
  body: string
}

export interface ChangeDocs {
  hasProposal: boolean
  parts: DocPart[]
  design: string | null // null hides the Design section entirely – design.md is optional
}

// Sections that carry the spec deltas rather than prose. They get a section of their own later.
const SKIP_SECTIONS = ["capabilities"]

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === "") start++
  while (end > start && lines[end - 1].trim() === "") end--
  return lines.slice(start, end)
}

// Splits on `##` headings. Text before the first heading belongs to no section and is dropped.
export function parseSections(content: string): DocSection[] {
  const sections: DocSection[] = []
  let current: { name: string; lines: string[] } | null = null
  let fence: string | null = null

  for (const raw of content.replace(/\r\n?/g, "\n").split("\n")) {
    const fenceMatch = FENCE.exec(raw)
    if (fence !== null) {
      if (fenceMatch && raw.trim().startsWith(fence)) fence = null
      current?.lines.push(raw)
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      current?.lines.push(raw)
      continue
    }
    const heading = SECTION.exec(raw)
    if (heading) {
      if (current) sections.push({ name: current.name, body: trimBlankEdges(current.lines).join("\n") })
      current = { name: heading[1].trim(), lines: [] }
      continue
    }
    current?.lines.push(raw)
  }
  if (current) sections.push({ name: current.name, body: trimBlankEdges(current.lines).join("\n") })
  return sections
}

export function sectionBody(sections: DocSection[], name: string): string {
  return sections.find((s) => s.name.toLowerCase() === name.toLowerCase())?.body ?? ""
}

// The opening of a text, cut to `maxChars` – what a collapsed section shows instead of its body.
// The budget is in characters, not source lines: a markdown paragraph is one line in the file and
// wraps to a dozen rows in a 40-column sidebar, so counting lines here promises nothing.
export function teaser(text: string, maxChars: number): string {
  const first = text.split("\n").find((l) => l.trim() !== "")?.trim() ?? ""
  if (first.length <= maxChars) return first
  const cut = first.slice(0, maxChars)
  const space = cut.lastIndexOf(" ")
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[.,;:–-]$/, "")}…`
}

// The proposal as titled blocks, in file order. Each `##` section becomes one part; the body is
// passed through unchanged (the markdown renderer strips `**` on its own).
export function proposalParts(content: string): DocPart[] {
  return parseSections(content)
    .filter((s) => !SKIP_SECTIONS.includes(s.name.toLowerCase()))
    .map((s) => ({ label: s.name, body: s.body }))
}

// What the collapsed section teases: Why when the proposal has one, the opening block otherwise.
export function leadBody(parts: DocPart[]): string {
  return (parts.find((p) => p.label.toLowerCase() === "why") ?? parts[0])?.body ?? ""
}

export function parseChangeDocs(artifacts: ChangeArtifacts): ChangeDocs {
  return {
    hasProposal: artifacts.proposal !== null,
    parts: artifacts.proposal ? proposalParts(artifacts.proposal) : [],
    design: artifacts.design,
  }
}

// One listing tells us which artifacts exist, so only those get read. Every failure degrades to
// "absent" – a change without a proposal renders, it doesn't break the card.
export async function readChangeArtifacts(client: FileClient, name: string): Promise<ChangeArtifacts> {
  const base = `${ROOT}/changes/${name}`
  let present: Set<string>
  try {
    present = new Set((await client.list(base)).filter((e) => e.type === "file").map((e) => e.name))
  } catch {
    return { proposal: null, design: null }
  }
  const read = async (file: string): Promise<string | null> => {
    if (!present.has(file)) return null
    try {
      return (await client.read(`${base}/${file}`)) || null
    } catch {
      return null
    }
  }
  const [proposal, design] = await Promise.all([read("proposal.md"), read("design.md")])
  return { proposal, design }
}
