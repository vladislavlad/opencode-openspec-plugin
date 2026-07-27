import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { TuiPluginApi, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { OpenSpecSidebar } from "../src/sidebar"

const theme = {
  text: "#ffffff",
  textMuted: "#888888",
  accent: "#00aaff",
  secondary: "#aa88ff",
  success: "#00ff00",
  warning: "#ffaa00",
  error: "#ff0000",
  background: "#000000",
  borderSubtle: "#444444",
} as unknown as TuiThemeCurrent

// A project on disk, as the file API would report it. Paths not listed here read as missing.
type Fs = { dirs: Record<string, { name: string; type: "file" | "directory" }[]>; files: Record<string, string> }

function stubApi(fs: Fs, opts: { busy?: boolean; kv?: Record<string, unknown> } = {}): TuiPluginApi {
  const kv = opts.kv ?? {}
  return {
    theme: { current: theme },
    state: {
      path: { directory: "/project" },
      session: { status: () => ({ type: opts.busy ? "busy" : "idle" }) },
    },
    client: {
      file: {
        list: ({ path }: { path: string }) => Promise.resolve({ data: fs.dirs[path] ?? [] }),
        read: ({ path }: { path: string }) => Promise.resolve({ data: { content: fs.files[path] ?? "" } }),
      },
      command: { list: () => Promise.resolve({ data: [{ name: "opsx-propose" }] }) },
    },
    kv: { ready: true, get: (k: string) => kv[k], set: (k: string, v: unknown) => void (kv[k] = v) },
    ui: { toast: () => {} },
    renderer: { on: () => {}, off: () => {}, currentFocusedRenderable: null },
    keymap: { registerLayer: () => {} },
  } as unknown as TuiPluginApi
}

const dir = (...names: string[]) => names.map((name) => ({ name, type: "directory" as const }))
const file = (...names: string[]) => names.map((name) => ({ name, type: "file" as const }))

// Everything `openspec init --tools opencode` writes, so `hasOpenSpecTooling` reports true.
const TOOLED: Fs["dirs"] = {
  ".opencode/commands": file(
    "opsx-apply.md",
    "opsx-archive.md",
    "opsx-explore.md",
    "opsx-propose.md",
    "opsx-sync.md",
    "opsx-update.md",
  ),
  ".opencode/skills": dir(
    "openspec-apply-change",
    "openspec-archive-change",
    "openspec-explore",
    "openspec-propose",
    "openspec-sync-specs",
    "openspec-update-change",
  ),
}

// The sidebar loads asynchronously, so let the poll settle before capturing. The frame comes back
// as one whitespace-collapsed line: the panel wraps by word, and asserting on wrapped text would
// pin the tests to a terminal width nobody chose.
async function frame(fs: Fs, opts?: { busy?: boolean; kv?: Record<string, unknown> }): Promise<string> {
  const { renderOnce, captureCharFrame, renderer } = await testRender(
    () => <OpenSpecSidebar api={stubApi(fs, opts)} sessionId="s1" baselineAvailable={true} />,
    { width: 46, height: 26 },
  )
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 10))
    await renderOnce()
  }
  const out = captureCharFrame()
  renderer.destroy()
  return out.replace(/\s+/g, " ").trim()
}

test("an unprepared project gets the Init screen, not the browser", async () => {
  const out = await frame({ dirs: {}, files: {} })
  expect(out).toContain("OpenSpec") // header
  expect(out).toContain("Not initialized for this project")
  expect(out).toContain("Init")
  expect(out).not.toContain("Active Changes")
})

test("a set-up project lists its changes and specs with the action row", async () => {
  const out = await frame({
    dirs: {
      ...TOOLED,
      openspec: dir("changes", "specs"),
      "openspec/changes": dir("add-search"),
      "openspec/specs": dir("sidebar-ui"),
    },
    files: {
      "openspec/changes/add-search/tasks.md": "- [x] one\n- [ ] two\n",
      "openspec/specs/sidebar-ui/spec.md": "## Purpose\nОболочка панели\n\n## Requirements\n\n### Requirement: Опрос\nПанель SHALL опрашивать.\n\n#### Scenario: Тик\n- **WHEN** прошло 3 секунды\n- **THEN** данные перечитываются\n",
    },
  })
  expect(out).toContain("Explore")
  expect(out).toContain("Propose")
  expect(out).toContain("Active Changes")
  expect(out).toContain("add-search")
  expect(out).toContain("Specifications")
  expect(out).not.toContain("Not initialized")
})

// The marker without the `tooling` checkpoint means setup never got off the ground – the Init screen
// owns the view even though the directories exist.
test("a setup that never checkpointed tooling still shows the Init screen", async () => {
  const out = await frame({
    dirs: { ...TOOLED, openspec: dir("specs"), "openspec/specs": [] },
    files: { "openspec/config.yaml": "schema: spec-driven\nplugin:\n  init:\n    in-progress: true\n    done: []\n" },
  })
  expect(out).toContain("Setup aborted")
  expect(out).toContain("Init")
  expect(out).not.toContain("Active Changes")
})

// Past the tooling checkpoint the browser stays, and the interrupted banner offers to continue.
test("an interrupted setup past tooling offers Resume above the browser", async () => {
  const out = await frame({
    dirs: { ...TOOLED, openspec: dir("specs"), "openspec/specs": [] },
    files: {
      "openspec/config.yaml":
        'schema: spec-driven\nplugin:\n  init:\n    in-progress: true\n    done: ["tooling"]\n',
    },
  })
  expect(out).toContain("Initialization stopped")
  expect(out).toContain("while configuring the project")
  expect(out).toContain("Resume")
  expect(out).toContain("Dismiss")
})

// The flag names the version an update turn was heading to; when it isn't the running one, the
// sidebar waits for the restart instead of migrating.
test("an update flag for another build asks for a reopen", async () => {
  const out = await frame({
    dirs: { ...TOOLED, openspec: dir("specs"), "openspec/specs": [] },
    files: {
      "openspec/config.yaml":
        "schema: spec-driven\nplugin:\n  update-in-progress:\n    old: 0.3.0\n    new: 9.9.9\n",
    },
  })
  expect(out).toContain("Reopen opencode to finish updating to 9.9.9")
  expect(out).not.toContain("Complete Update")
})
