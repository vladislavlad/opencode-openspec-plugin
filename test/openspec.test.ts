import { describe, expect, test } from "bun:test"
import {
  hasOpenSpecTooling,
  isComplete,
  isGroupComplete,
  parseSpec,
  parseTasks,
  readOpenSpec,
  summaryEquals,
  type FileClient,
  type OpenSpecSummary,
} from "../src/lib/openspec"

// ---- in-memory FileClient -------------------------------------------------

type Entry = { name: string; type: "file" | "directory" }

function dir(...names: string[]): Entry[] {
  return names.map((name) => ({ name, type: "directory" as const }))
}
function files(...names: string[]): Entry[] {
  return names.map((name) => ({ name, type: "file" as const }))
}

// `list`/`read` return the mapped value, or empty when the path is unknown (mirrors how the real
// client swallows a missing dir into an empty listing). `throwOn` forces the error branch.
function mockClient(opts: {
  list?: Record<string, Entry[]>
  read?: Record<string, string>
  throwOn?: string[]
}): FileClient {
  const throwSet = new Set(opts.throwOn ?? [])
  return {
    list: async (path) => {
      if (throwSet.has(path)) throw new Error(`boom: ${path}`)
      return opts.list?.[path] ?? []
    },
    read: async (path) => opts.read?.[path] ?? "",
  }
}

const ALL_COMMANDS = files(
  "opsx-apply.md",
  "opsx-archive.md",
  "opsx-explore.md",
  "opsx-propose.md",
  "opsx-sync.md",
  "opsx-update.md",
)
const ALL_SKILLS = dir(
  "openspec-apply-change",
  "openspec-archive-change",
  "openspec-explore",
  "openspec-propose",
  "openspec-sync-specs",
  "openspec-update-change",
)

// ---- parseTasks -----------------------------------------------------------

describe("parseTasks", () => {
  test("counts done and undone checkboxes, case-insensitive", () => {
    const r = parseTasks("- [ ] a\n- [x] b\n- [X] c\n* [ ] d")
    expect(r.total).toBe(4)
    expect(r.completed).toBe(2)
  })

  test("tasks before the first heading land in an untitled group", () => {
    const r = parseTasks("- [ ] loose\n## Group A\n- [x] inside")
    expect(r.groups.length).toBe(2)
    expect(r.groups[0]).toEqual({ title: "", tasks: [{ done: false, text: "loose" }] })
    expect(r.groups[1].title).toBe("Group A")
    expect(r.groups[1].tasks).toEqual([{ done: true, text: "inside" }])
  })

  test("headings without tasks still open a group", () => {
    const r = parseTasks("## Empty\n## Filled\n- [ ] x")
    expect(r.groups.map((g) => g.title)).toEqual(["Empty", "Filled"])
    expect(r.groups[0].tasks).toEqual([])
  })

  test("non-task, non-heading lines are ignored", () => {
    const r = parseTasks("intro text\n- [ ] real\nmore prose")
    expect(r.total).toBe(1)
    expect(r.groups[0].tasks[0].text).toBe("real")
  })

  test("empty content yields nothing", () => {
    expect(parseTasks("")).toEqual({ total: 0, completed: 0, groups: [] })
  })
})

// ---- isComplete / isGroupComplete -----------------------------------------

describe("completion predicates", () => {
  const change = (completedTasks: number, totalTasks: number) => ({
    name: "c",
    completedTasks,
    totalTasks,
    groups: [],
  })

  test("isComplete requires all tasks done and at least one task", () => {
    expect(isComplete(change(3, 3))).toBe(true)
    expect(isComplete(change(2, 3))).toBe(false)
    expect(isComplete(change(0, 0))).toBe(false) // no tasks is not "complete"
  })

  test("isGroupComplete requires a non-empty, all-done group", () => {
    expect(isGroupComplete({ title: "", tasks: [{ done: true, text: "a" }] })).toBe(true)
    expect(isGroupComplete({ title: "", tasks: [{ done: true, text: "a" }, { done: false, text: "b" }] })).toBe(false)
    expect(isGroupComplete({ title: "", tasks: [] })).toBe(false)
  })
})

// ---- parseSpec ------------------------------------------------------------

describe("parseSpec", () => {
  test("parses title, description, purpose, requirements and scenarios", () => {
    const md = [
      "# Auth Specification",
      "",
      "Handles login and sessions.",
      "",
      "## Purpose",
      "Users sign in with email and password.",
      "",
      "## Requirements",
      "",
      "### Requirement: Login",
      "The system SHALL authenticate a user by email and password.",
      "",
      "#### Scenario: Valid credentials",
      "- **WHEN** the user submits correct credentials",
      "- **THEN** a session is created",
    ].join("\n")
    const spec = parseSpec("auth", md)
    expect(spec.name).toBe("auth")
    expect(spec.title).toBe("Auth") // "Specification" suffix stripped
    expect(spec.description).toBe("Handles login and sessions.")
    expect(spec.purpose).toBe("Users sign in with email and password.")
    expect(spec.requirements).toHaveLength(1)
    const req = spec.requirements[0]
    expect(req.name).toBe("Login")
    expect(req.description).toBe("The system SHALL authenticate a user by email and password.")
    expect(req.scenarios).toHaveLength(1)
    expect(req.scenarios[0].name).toBe("Valid credentials") // "Scenario:" affix stripped
    expect(req.scenarios[0].lines).toEqual([
      "- **WHEN** the user submits correct credentials",
      "- **THEN** a session is created",
    ])
  })

  test("strips the 'Specification:' prefix and falls back to the dir name", () => {
    expect(parseSpec("billing", "# Specification: Billing\n").title).toBe("Billing")
    expect(parseSpec("payments", "## Requirements\n").title).toBe("payments") // no `#` heading
  })

  test("only counts requirements under a ## Requirements section", () => {
    const md = ["## Overview", "### Requirement: NotCounted", "## Requirements", "### Requirement: Counted"].join("\n")
    const spec = parseSpec("x", md)
    expect(spec.requirements.map((r) => r.name)).toEqual(["Counted"])
  })

  test("ignores headings inside fenced code blocks", () => {
    const md = [
      "## Requirements",
      "",
      "### Requirement: Real",
      "The system SHALL work.",
      "",
      "```",
      "### Requirement: Fake",
      "```",
      "",
      "#### Scenario: Case",
      "- **WHEN** a",
      "- **THEN** b",
    ].join("\n")
    const spec = parseSpec("x", md)
    expect(spec.requirements).toHaveLength(1)
    expect(spec.requirements[0].name).toBe("Real")
    expect(spec.requirements[0].scenarios).toHaveLength(1)
  })
})

// ---- summaryEquals --------------------------------------------------------

describe("summaryEquals", () => {
  const base = (): OpenSpecSummary => ({
    root: "openspec",
    specCount: 1,
    requirementCount: 1,
    specs: [
      {
        name: "auth",
        title: "Auth",
        description: "",
        purpose: "",
        requirements: [{ name: "Login", description: "d", scenarios: [{ name: "s", lines: ["- **WHEN** x"] }] }],
      },
    ],
    changes: [{ name: "add-x", completedTasks: 1, totalTasks: 2, groups: [] }],
  })

  test("equal for identical structures and same reference", () => {
    const a = base()
    expect(summaryEquals(a, a)).toBe(true)
    expect(summaryEquals(base(), base())).toBe(true)
  })

  test("null handling", () => {
    expect(summaryEquals(null, null)).toBe(true)
    expect(summaryEquals(base(), null)).toBe(false)
    expect(summaryEquals(null, base())).toBe(false)
  })

  test("detects a changed task count", () => {
    const b = base()
    b.changes[0].completedTasks = 2
    expect(summaryEquals(base(), b)).toBe(false)
  })

  test("detects a changed scenario line", () => {
    const b = base()
    b.specs[0].requirements[0].scenarios[0].lines = ["- **WHEN** y"]
    expect(summaryEquals(base(), b)).toBe(false)
  })
})

// ---- hasOpenSpecTooling ---------------------------------------------------

describe("hasOpenSpecTooling", () => {
  test("true when every command and skill is present", async () => {
    const client = mockClient({
      list: { ".opencode/commands": ALL_COMMANDS, ".opencode/skills": ALL_SKILLS },
    })
    expect(await hasOpenSpecTooling(client)).toBe(true)
  })

  test("false when a command is missing", async () => {
    const client = mockClient({
      list: { ".opencode/commands": ALL_COMMANDS.slice(1), ".opencode/skills": ALL_SKILLS },
    })
    expect(await hasOpenSpecTooling(client)).toBe(false)
  })

  test("false when a skill is missing", async () => {
    const client = mockClient({
      list: { ".opencode/commands": ALL_COMMANDS, ".opencode/skills": ALL_SKILLS.slice(1) },
    })
    expect(await hasOpenSpecTooling(client)).toBe(false)
  })

  test("false when listing the commands dir throws", async () => {
    const client = mockClient({ throwOn: [".opencode/commands"] })
    expect(await hasOpenSpecTooling(client)).toBe(false)
  })
})

// ---- readOpenSpec ---------------------------------------------------------

describe("readOpenSpec", () => {
  test("returns null when neither openspec nor .openspec exists", async () => {
    expect(await readOpenSpec(mockClient({}))).toBeNull()
  })

  test("reads changes and specs from the openspec root", async () => {
    const client = mockClient({
      list: {
        openspec: dir("changes", "specs"),
        "openspec/changes": dir("add-login", "archive"),
        "openspec/specs": dir("auth"),
      },
      read: {
        "openspec/changes/add-login/tasks.md": "- [x] done\n- [ ] todo",
        "openspec/specs/auth/spec.md": "# Auth\n\n## Requirements\n\n### Requirement: Login\nThe system SHALL log in.",
      },
    })
    const summary = await readOpenSpec(client)
    expect(summary?.root).toBe("openspec")
    // "archive" is skipped, only real changes remain
    expect(summary?.changes.map((c) => c.name)).toEqual(["add-login"])
    expect(summary?.changes[0]).toMatchObject({ completedTasks: 1, totalTasks: 2 })
    expect(summary?.specCount).toBe(1)
    expect(summary?.requirementCount).toBe(1)
    expect(summary?.specs[0].name).toBe("auth")
  })

  test("falls back to the .openspec root when openspec is empty", async () => {
    const client = mockClient({
      list: {
        ".openspec": dir("specs"),
        ".openspec/specs": dir("core"),
      },
      read: { ".openspec/specs/core/spec.md": "# Core\n\n## Requirements\n\n### Requirement: R\nThe system SHALL r." },
    })
    const summary = await readOpenSpec(client)
    expect(summary?.root).toBe(".openspec")
    expect(summary?.specs.map((s) => s.name)).toEqual(["core"])
  })

  test("skips a spec whose spec.md is empty", async () => {
    const client = mockClient({
      list: { openspec: dir("specs"), "openspec/specs": dir("ghost") },
      read: {}, // ghost/spec.md reads as ""
    })
    const summary = await readOpenSpec(client)
    expect(summary?.specCount).toBe(0)
  })
})
