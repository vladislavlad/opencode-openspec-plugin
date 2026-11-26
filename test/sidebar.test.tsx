import { afterAll, beforeAll, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import type { Context } from "@opencode/plugin/tui/context"
import type { ThemeColors } from "../src/lib/theme"
import { OpenSpecSidebar } from "../src/sidebar"
import { VERSION } from "../src/lib/version"

// The poll asks npm for the latest versions. Left to the real network, an update banner appears
// wherever the registry answers and not where it doesn't, so the frame differs between a laptop and
// CI — and everything below the banner shifts down out of a 26-row capture. `fetchLatest` turns any
// failure into null, which is the "nothing to report" path these tests want.
const realFetch = globalThis.fetch
beforeAll(() => {
  globalThis.fetch = (() => Promise.reject(new Error("no registry in tests"))) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = realFetch
})

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
} as unknown as ThemeColors

// A project on disk, as the file API would report it. Paths not listed here read as missing.
type Fs = { dirs: Record<string, { name: string; type: "file" | "directory" }[]>; files: Record<string, string> }

function stubApi(fs: Fs, opts: { busy?: boolean; kv?: Record<string, unknown> } = {}): Context {
  const kv = opts.kv ?? {}
  return {
    theme: {
      hue: { interactive: { 200: theme.secondary }, accent: { 200: theme.accent } },
      text: { base: theme.text, muted: theme.textMuted, action: { primary: { base: theme.accent }, secondary: { base: theme.secondary } }, feedback: { success: { base: theme.success }, warning: { base: theme.warning }, error: { base: theme.error } } },
      background: { base: theme.background }, border: { base: theme.borderSubtle },
    },
    location: { directory: "/project" },
    data: { session: { get: () => ({ location: { directory: "/project" } }), status: () => opts.busy ? "running" : "idle" } },
    client: {
      session: { switchAgent: async () => {}, switchModel: async () => {}, prompt: async () => {} },
      file: {
        list: ({ path }: { path: string }) => Promise.resolve({ data: (fs.dirs[path] ?? []).map((entry) => ({ path: `${path}/${entry.name}${entry.type === "directory" ? "/" : ""}`, type: entry.type })) }),
        read: ({ path }: { path: string }) => Promise.resolve(new TextEncoder().encode(fs.files[path] ?? "")),
      },
      skill: { list: async () => ({ data: [] }) },
      command: { list: () => Promise.resolve({ data: [{ name: "opsx-propose" }] }) },
    },
    storage: { store: () => [kv, async (update: (draft: typeof kv) => void) => update(kv)] },
    ui: { toast: { show: () => {} }, router: { current: () => ({ type: "session", sessionID: "s1" }) }, model: { current: () => ({ providerID: "provider", modelID: "model" }) } },
    renderer: { on: () => {}, off: () => {}, currentFocusedRenderable: null },
    keymap: { layer: () => {} },
  } as unknown as Context
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

// A mounted sidebar to drive: `settle` lets the async load and every later click land, `rows` is the
// frame line by line so a row can be found and clicked by its text.
async function mount(fs: Fs, opts?: { busy?: boolean; kv?: Record<string, unknown>; height?: number; configure?: (api: Context) => void }) {
  const api = stubApi(fs, opts)
  opts?.configure?.(api)
  const { renderOnce, captureCharFrame, renderer, mockMouse } = await testRender(
    () => <OpenSpecSidebar api={api} sessionId="s1" baselineAvailable={true} />,
    // A test that walks into a tree needs room for the rows it clicks; a row pushed past the last
    // line is invisible to the frame and so to the assertions.
    { width: 46, height: opts?.height ?? 26 },
  )
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 10))
      await renderOnce()
    }
  }
  const rows = () => captureCharFrame().split("\n")
  await settle()
  return {
    rows,
    settle,
    destroy: () => renderer.destroy(),
    // Clicks `text` where it is drawn. On the text itself, not somewhere on its row: a row can hold
    // a label and a control side by side, and only one of them is clickable.
    click: async (text: string) => {
      const y = rows().findIndex((line) => line.includes(text))
      if (y < 0) throw new Error(`no row containing "${text}"`)
      await mockMouse.click(rows()[y].indexOf(text) + 1, y)
      await settle()
    },
  }
}

// The sidebar loads asynchronously, so let the poll settle before capturing. The frame comes back
// as one whitespace-collapsed line: the panel wraps by word, and asserting on wrapped text would
// pin the tests to a terminal width nobody chose.
async function frame(fs: Fs, opts?: { busy?: boolean; kv?: Record<string, unknown> }): Promise<string> {
  const view = await mount(fs, opts)
  const out = view.rows().join("\n")
  view.destroy()
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
  expect(out).not.toContain("edit, then run")
  expect(out).not.toContain("other actions: Build")
  expect(out.match(/\bExplore\b/g)).toHaveLength(1)
  expect(out.match(/\bPropose\b/g)).toHaveLength(1)
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

// Grouping only shows up when the files are grouped: a flat project must look exactly as before.
test("a grouped project shows an Areas list beside the loose capabilities", async () => {
  const spec = (name: string) =>
    `## Purpose\n${name}\n\n## Requirements\n\n### Requirement: R\nСистема SHALL работать.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n`
  const out = await frame({
    dirs: {
      ...TOOLED,
      openspec: dir("specs"),
      "openspec/specs": dir("backend", "project-config"),
      "openspec/specs/backend": dir("api", "auth"),
    },
    files: {
      "openspec/specs/project-config/spec.md": spec("Конфиг"),
      "openspec/specs/backend/auth/spec.md": spec("Вход"),
      "openspec/specs/backend/api/spec.md": spec("API"),
    },
  })
  expect(out).toContain("Specifications: 3") // every level counted
  expect(out).toContain("Areas: 1")
  expect(out).toContain("backend")
  expect(out).toContain("2 capabilities")
  expect(out).toContain("Capabilities: 1")
  expect(out).toContain("project-config")
})

// Walking the tree is the sidebar's own wiring: entering holds the full path, and leaving goes one
// level up rather than home. The header count stays the whole project at every level.
test("clicking an area opens it, and back returns to the area above", async () => {
  const spec = (name: string) =>
    `## Purpose\n${name}\n\n## Requirements\n\n### Requirement: R\nSHALL.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n`
  const view = await mount({
    dirs: {
      ...TOOLED,
      openspec: dir("specs"),
      "openspec/specs": dir("backend"),
      "openspec/specs/backend": dir("auth", "inner"),
      "openspec/specs/backend/inner": dir("queue"),
    },
    files: {
      "openspec/specs/backend/auth/spec.md": spec("Вход"),
      "openspec/specs/backend/inner/queue/spec.md": spec("Очередь"),
    },
  }, { height: 40 })
  const text = () => view.rows().join("\n").replace(/\s+/g, " ")

  expect(text()).not.toContain("← back") // the root is not an area

  await view.click("▪ backend")
  expect(text()).toContain("▪ backend") // the header names where we are
  expect(text()).toContain("← back")
  expect(text()).toContain("▪ auth") // by leaf name, inside the node
  expect(text()).toContain("Specifications: 2") // still the whole project

  await view.click("▪ inner")
  expect(text()).toContain("▪ backend/inner") // the full path, not just the leaf
  expect(text()).toContain("▪ queue")

  await view.click("← back")
  expect(text()).toContain("▪ backend")
  expect(text()).not.toContain("▪ backend/inner") // one level up, not home

  await view.click("← back")
  expect(text()).not.toContain("← back")
  expect(text()).toContain("Areas: 1")
  view.destroy()
})

test("a flat project shows neither heading", async () => {
  const out = await frame({
    dirs: { ...TOOLED, openspec: dir("specs"), "openspec/specs": dir("sidebar-ui") },
    files: {
      "openspec/specs/sidebar-ui/spec.md": "## Purpose\nПанель\n\n## Requirements\n\n### Requirement: R\nSHALL.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n",
    },
  })
  expect(out).toContain("Specifications: 1")
  expect(out).toContain("sidebar-ui")
  expect(out).not.toContain("Areas:")
  expect(out).not.toContain("Capabilities:")
})


test("setup reloads the native catalog and a failed reload can be retried", async () => {
  const [busy, setBusy] = createSignal(false)
  const fs: Fs = { dirs: {}, files: {} }
  let reloads = 0
  let registered = false
  const view = await mount(fs, {
    get busy() { return busy() },
    height: 40,
    configure(api) {
      api.client.session.prompt = async () => { setBusy(true) }
      api.client.command.list = async () => ({ data: registered ? [{ name: "opsx-propose" }] : [] }) as any
      api.client.location = { reload: async () => {
        reloads++
        if (reloads === 1) throw new Error("temporarily offline")
        registered = true
      } } as any
    },
  })
  try {
    await view.click("Init")
    expect(busy()).toBe(true)
    fs.dirs = { ...TOOLED, openspec: [{ name: "config.yaml", type: "file" }] }
    fs.files["openspec/config.yaml"] = "schema: spec-driven"
    setBusy(false)
    await view.settle()
    expect(reloads).toBe(1)
    expect(view.rows().join(" ")).toContain("Retry commands")
    await view.click("Retry commands")
    expect(reloads).toBe(2)
    expect(view.rows().join(" ")).not.toContain("Retry commands")
    expect(view.rows().join(" ")).toContain("Explore")
  } finally { view.destroy() }
})

test("duplicate and competing update clicks keep the accepted turn's reload", async () => {
  const [busy, setBusy] = createSignal(false)
  const toasts: string[] = []
  let sends = 0
  let finish!: () => void
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (url) => new Response(JSON.stringify({ version: String(url).endsWith("opencode-v2-openspec-plugin/latest") ? "2.9.9" : "2.2.0" }))) as typeof fetch
  const view = await mount({
    dirs: { ".opencode/skills": dir("openspec-explore") },
    files: { ".opencode/skills/openspec-explore/SKILL.md": '---\nmetadata:\n  generatedBy: "1.14.3"\n---\n' },
  }, {
    get busy() { return busy() },
    kv: { last: VERSION },
    configure(api) {
      api.client.session.prompt = () => {
        sends++
        return new Promise<void>((resolve) => { finish = resolve })
      }
      api.ui.toast.show = (toast) => { toasts.push(toast.message) }
    },
  })
  try {
    await view.click("Settings")
    await view.click("Update")
    await view.click("Update")
    await view.click("Update All")
    expect(sends).toBe(1)
    expect(toasts).toHaveLength(2)
    expect(toasts.every((message) => message.includes("Wait until"))).toBe(true)
    expect(view.rows().join(" ")).not.toContain("Reload OpenCode")
    setBusy(true)
    await view.settle()
    finish()
    await view.settle()
    setBusy(false)
    await view.settle()
    expect(view.rows().join(" ")).toContain("Reload OpenCode")
  } finally {
    view.destroy()
    globalThis.fetch = previousFetch
  }
})

test("duplicate Complete Update preserves the accepted turn's version record", async () => {
  const [busy, setBusy] = createSignal(false)
  const kv = { last: "1.0.0" }
  let sends = 0
  let finish!: () => void
  const view = await mount({
    dirs: { ...TOOLED, openspec: dir("specs"), "openspec/specs": [] },
    files: { "openspec/config.yaml": `schema: spec-driven\nplugin:\n  update-in-progress:\n    old: 1.0.0\n    new: ${VERSION}\n` },
  }, {
    get busy() { return busy() },
    kv,
    height: 40,
    configure(api) {
      api.client.session.prompt = () => {
        sends++
        return new Promise<void>((resolve) => { finish = resolve })
      }
    },
  })
  try {
    await view.click("Complete Update")
    await view.click("Complete Update")
    expect(sends).toBe(1)
    expect(kv.last).toBe("1.0.0")
    setBusy(true)
    await view.settle()
    finish()
    await view.settle()
    expect(kv.last).toBe("1.0.0")
    setBusy(false)
    await view.settle()
    expect(kv.last).toBe(VERSION)
  } finally { view.destroy() }
})

test("a failed update submission releases its gate without completing the update", async () => {
  const [busy, setBusy] = createSignal(false)
  let sends = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (url) => new Response(JSON.stringify({ version: String(url).endsWith("opencode-v2-openspec-plugin/latest") ? "2.9.9" : "2.2.0" }))) as typeof fetch
  const view = await mount({ dirs: {}, files: {} }, {
    get busy() { return busy() },
    kv: { last: VERSION },
    configure(api) {
      api.client.session.prompt = async () => {
        sends++
        if (sends === 1) throw new Error("offline")
        setBusy(true)
      }
    },
  })
  try {
    await view.click("Settings")
    await view.click("Update")
    expect(sends).toBe(1)
    // An unrelated agent turn must not complete the failed update.
    setBusy(true)
    await view.settle()
    setBusy(false)
    await view.settle()
    expect(view.rows().join(" ")).not.toContain("Reload OpenCode")
    await view.click("Update")
    expect(sends).toBe(2)
    setBusy(false)
    await view.settle()
    expect(view.rows().join(" ")).toContain("Reload OpenCode")
  } finally {
    view.destroy()
    globalThis.fetch = previousFetch
  }
})
