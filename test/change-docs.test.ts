import { expect, test } from "bun:test"
import {
  leadBody,
  parseChangeDocs,
  parseSections,
  proposalParts,
  readChangeArtifacts,
  sectionBody,
  teaser,
  type ChangeArtifacts,
} from "../src/lib/change-docs"
import type { FileClient } from "../src/lib/openspec"

const PROPOSAL = `## Why

Карточка показывает только задачи.

## What Changes

- Три секции
- Тизер

## Capabilities

### Added Capabilities
- \`change-tracking-ui\`: секции
`

// ---- parseSections --------------------------------------------------------

test("a proposal is cut into its ## sections", () => {
  const sections = parseSections(PROPOSAL)
  expect(sections.map((s) => s.name)).toEqual(["Why", "What Changes", "Capabilities"])
  expect(sections[0].body).toBe("Карточка показывает только задачи.")
  expect(sections[1].body).toBe("- Три секции\n- Тизер")
})

test("a heading inside a fenced block stays part of the body", () => {
  const sections = parseSections("## Why\n\n```\n## What Changes\n```\n")
  expect(sections).toHaveLength(1)
  expect(sections[0].body).toContain("## What Changes")
})

test("text before the first heading belongs to no section", () => {
  const sections = parseSections("preamble\n\n## Why\nbody\n")
  expect(sections).toHaveLength(1)
  expect(sections[0].body).toBe("body")
})

test("a section is found regardless of case, and a missing one is empty", () => {
  const sections = parseSections(PROPOSAL)
  expect(sectionBody(sections, "what changes")).toContain("Три секции")
  expect(sectionBody(sections, "Non-goals")).toBe("")
})

// ---- teaser ---------------------------------------------------------------

test("the teaser is the opening paragraph, not the ones after it", () => {
  expect(teaser("\n\nfirst\n\nsecond", 40)).toBe("first")
})

test("a long paragraph is cut on a word boundary and marked with an ellipsis", () => {
  const cut = teaser("Карточка изменения показывает только задачи и ничего больше", 30)
  expect(cut.endsWith("…")).toBe(true)
  expect(cut.length).toBeLessThanOrEqual(31)
  expect(cut).toBe("Карточка изменения показывает…") // no half-word, no dangling separator
})

test("the teaser of a short text is the whole text, and of an empty one is empty", () => {
  expect(teaser("only", 40)).toBe("only")
  expect(teaser("  \n\n", 40)).toBe("")
})

// ---- proposalParts --------------------------------------------------------

const GOALS = `## Why

Коротко зачем.

## Goals / Non-Goals

**Goals:**
- Первая цель

**Non-Goals:**
- Не цель
`

test("sections become parts in file order, bold labels stay as-is", () => {
  const parts = proposalParts(GOALS)
  expect(parts.map((p) => p.label)).toEqual(["Why", "Goals / Non-Goals"])
})

test("the delta list is not part of the proposal body", () => {
  expect(proposalParts(PROPOSAL).map((p) => p.label)).toEqual(["Why", "What Changes"])
})

test("a section without bold labels stays as one part with its own name", () => {
  const parts = proposalParts(`## Custom Section\n\nТекст без подписей.\n`)
  expect(parts.map((p) => p.label)).toEqual(["Custom Section"])
})

test("the lead is Why when there is one, the opening block otherwise", () => {
  expect(leadBody(proposalParts(GOALS))).toBe("Коротко зачем.")
  expect(leadBody(proposalParts("## Goals\n\n- Цель\n"))).toBe("- Цель")
  expect(leadBody([])).toBe("")
})

// ---- parseChangeDocs ------------------------------------------------------

test("the docs of a change carry the proposal parts and design", () => {
  const docs = parseChangeDocs({ proposal: PROPOSAL, design: "## Контекст\ntext" })
  expect(docs.hasProposal).toBe(true)
  expect(docs.parts.map((p) => p.label)).toEqual(["Why", "What Changes"])
  expect(docs.design).toContain("Контекст")
})

test("a change without artifacts reports both as absent", () => {
  const docs = parseChangeDocs({ proposal: null, design: null })
  expect(docs.hasProposal).toBe(false)
  expect(docs.parts).toEqual([])
  expect(docs.design).toBeNull()
})

// ---- readChangeArtifacts --------------------------------------------------

function mockClient(opts: { files?: string[]; read?: Record<string, string>; throwOn?: string[] }): FileClient {
  const throwSet = new Set(opts.throwOn ?? [])
  return {
    list: async (path) => {
      if (throwSet.has(path)) throw new Error(`boom: ${path}`)
      return (opts.files ?? []).map((name) => ({ name, type: "file" as const }))
    },
    read: async (path) => {
      if (throwSet.has(path)) throw new Error(`boom: ${path}`)
      return opts.read?.[path] ?? ""
    },
  }
}

const artifacts = (c: FileClient): Promise<ChangeArtifacts> => readChangeArtifacts(c, "my-change")

test("only the artifacts that exist are read", async () => {
  const read: string[] = []
  const client = mockClient({ files: ["proposal.md", "tasks.md"], read: { "openspec/changes/my-change/proposal.md": "## Why\nbody" } })
  const spied: FileClient = { list: client.list, read: (p) => (read.push(p), client.read(p)) }
  const result = await artifacts(spied)
  expect(result.proposal).toContain("body")
  expect(result.design).toBeNull()
  expect(read).toEqual(["openspec/changes/my-change/proposal.md"])
})

test("an unreadable directory or file counts as absent", async () => {
  expect(await artifacts(mockClient({ throwOn: ["openspec/changes/my-change"] }))).toEqual({ proposal: null, design: null })
  const unreadable = mockClient({ files: ["proposal.md"], throwOn: ["openspec/changes/my-change/proposal.md"] })
  expect((await artifacts(unreadable)).proposal).toBeNull()
})

test("an empty file counts as absent", async () => {
  const result = await artifacts(mockClient({ files: ["design.md"] })) // read returns ""
  expect(result.design).toBeNull()
})
