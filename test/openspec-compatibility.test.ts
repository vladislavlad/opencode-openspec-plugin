import { describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { hasOpenSpecTooling, isComplete, parseTasks, readOpenSpec, summaryEquals, type FileClient, type OpenSpecSummary } from "../src/lib/openspec"
import { readCliVersion } from "../src/lib/updates"
import pkg from "../package.json"

// The pinned CLI is a test oracle only. Production never imports its internals or shells out.
const cliRoot = resolve(dirname(fileURLToPath(import.meta.resolve("@fission-ai/openspec"))), "..")
const { parseTaskLines, countTasksFromContent } = await import(
  pathToFileURL(join(cliRoot, "dist/utils/task-progress.js")).href
)

const cases = [
  { name: "nested and ordered lists", content: "- [x] parent\n  - [ ] child\n\t+ [X] tab\n1. [ ] ordered\n42) [x] done\n999999999. [ ] limit\n1000000000. [ ] not a list" },
  { name: "empty, padded and unfinished markers", content: "- [] empty\n- [~] ongoing\n- [-] deferred\n- [!] unknown\n- [ x ] done\n* [ X] done\n+[ ] compact\n-[x]done" },
  { name: "links and multi-character labels", content: "- [A](./doc.md)\n- [1][ref]\n- [Some doc](./doc.md)\n- [WIP] ignored\n- [ ](pending)\n- [ ][pending]\n- [A] unfinished" },
  { name: "CRLF and blank descriptions", content: "## Tasks\r\n- [x] done\r\n- [ ] pending\r\n- []\r\n- [ x ]\r\n" },
  { name: "checkboxes in examples and comments", content: "```md\n- [ ] example\n```\n<!--\n+ [x] documented\n-->\n    - [~] indented" },
  { name: "headings and non-task prose", content: "- [ ] loose\n## Backend\n1. [ x ] done\n  - [~] pending\n- plain bullet\n## Empty\n" },
]

describe("task parsing matches OpenSpec 1.14.3", () => {
  test.each(cases)("$name", ({ content }) => {
    const parsed = parseTasks(content)
    expect({ total: parsed.total, completed: parsed.completed }).toEqual(countTasksFromContent(content))
    expect(parsed.groups.flatMap((group) => group.tasks.map(({ done, text }) => ({ done, description: text }))))
      .toEqual(parseTaskLines(content))
  })

  test("unfinished nested tasks keep the change active and preserve their group", () => {
    const parsed = parseTasks("## Work\n1. [ x ] parent\n  + [~] child\n  - [] next")
    expect(parsed).toEqual({
      total: 3,
      completed: 1,
      groups: [{ title: "Work", tasks: [
        { done: true, text: "parent", depth: 0, marker: "x", number: "1." },
        { done: false, text: "child", depth: 1, marker: "~", number: "" },
        { done: false, text: "next", depth: 1, marker: "", number: "" },
      ] }],
    })
    expect(isComplete({ name: "fixture", totalTasks: parsed.total, completedTasks: parsed.completed, groups: parsed.groups })).toBe(false)
  })

  test("nesting follows indentation and resets at group headings", () => {
    const parsed = parseTasks("  - [ ] root\n    - [ ] child\n\t\t- [ ] grandchild\n  - [ ] sibling\n## Next\n    - [ ] root again")
    expect(parsed.groups.flatMap((g) => g.tasks.map((t) => t.depth))).toEqual([0, 1, 2, 0, 0])
  })

  test("CRLF preserves named groups, task metadata and heading nesting resets", () => {
    const lf = "## Backend\n- [x] Parent\n  1. [~] Child\n    + []\n## Frontend\n  2) [ ] New root\n    - [ X ] Done\n"
    const parsed = parseTasks(lf.replaceAll("\n", "\r\n"))
    expect(parsed).toEqual(parseTasks(lf))
    expect(parsed.groups.map((group) => group.title)).toEqual(["Backend", "Frontend"])
    expect(parsed.groups.map((group) => group.tasks.map((task) => task.depth))).toEqual([[0, 1, 2], [0, 1]])
    expect({ total: parsed.total, completed: parsed.completed }).toEqual({ total: 5, completed: 2 })
  })

  test.each([
    ["indentation", "- [ ] first\n  - [ ] next"],
    ["marker", "- [ ] first\n- [~] next"],
    ["number", "- [ ] first\n2. [ ] next"],
  ])("poll equality observes changed %s without changed counts", (_name, content) => {
    const summary = (text: string): OpenSpecSummary => {
      const parsed = parseTasks(text)
      return { specCount: 0, requirementCount: 0, specs: [], changes: [
        { name: "fixture", totalTasks: parsed.total, completedTasks: parsed.completed, groups: parsed.groups },
      ] }
    }
    const baseline = summary("- [ ] first\n- [ ] next")
    expect(summaryEquals(baseline, summary(content))).toBe(false)
    expect(summaryEquals(summary(content), summary(content))).toBe(true)
  })
})

test("detects tooling and reads progress from a project created by the pinned OpenSpec CLI", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "openspec-plugin-compat-"))
  const project = join(fixture, "project")
  await mkdir(project)
  const run = async (...args: string[]) => {
    const child = Bun.spawn([process.execPath, join(cliRoot, "bin/openspec.js"), ...args], {
      cwd: project,
      env: { ...process.env, CI: "1", OPENSPEC_TELEMETRY: "0", XDG_CONFIG_HOME: join(fixture, "config"), XDG_DATA_HOME: join(fixture, "data") },
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ])
    if (code !== 0) throw new Error(`openspec ${args.join(" ")} exited ${code}: ${stderr}\n${stdout}`)
    return stdout
  }
  const client: FileClient = {
    list: async (path) => (await readdir(join(project, path), { withFileTypes: true }))
      .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" })),
    read: (path) => readFile(join(project, path), "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return ""
      throw error
    }),
  }
  try {
    await run("init", "--tools", "opencode", "--profile", "core", "--no-animation")
    expect(await hasOpenSpecTooling(client)).toBe(true)
    expect(await readCliVersion(client)).toBe(pkg.devDependencies["@fission-ai/openspec"])
    expect((await readOpenSpec(client))?.changes).toEqual([])

    await run("new", "change", "compatibility-fixture", "--json")
    await writeFile(join(project, "openspec/changes/compatibility-fixture/tasks.md"), cases.map((item) => item.content).join("\n"))
    const upstream = JSON.parse(await run("list", "--json")).changes[0]
    const actual = (await readOpenSpec(client))?.changes[0]
    expect(actual?.name).toBe("compatibility-fixture")
    expect(actual?.totalTasks).toBe(upstream.totalTasks)
    expect(actual?.completedTasks).toBe(upstream.completedTasks)
    expect(actual?.totalTasks).toBeGreaterThan(0)
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}, 15000)
