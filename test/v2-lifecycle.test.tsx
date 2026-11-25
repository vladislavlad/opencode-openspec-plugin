import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { testRender } from "@opentui/solid"
import type { Context, SlotClaim } from "@opencode/plugin/tui/context"
import plugin from "../src/index"
import { Host } from "@opencode/plugin/host"
import { fileURLToPath } from "node:url"
import { projectLocation } from "../src/lib/location"
import { themeColors } from "../src/lib/theme"
import { fixture } from "./v2-fixture"

const colors = {
  hue: { interactive: { 200: "#aa88ff" }, accent: { 200: "#00aaff" } },
  text: { base: "#ffffff", muted: "#888888", action: { primary: { base: "#00aaff" }, secondary: { base: "#aa88ff" } }, feedback: { success: { base: "#00ff00" }, warning: { base: "#ffaa00" }, error: { base: "#ff0000" } } },
  background: { base: "#000000" }, border: { base: "#444444" },
} as unknown as Context["theme"]

test("native definition registers sidebar.content and releases its claim", () => {
  const f = fixture()
  let claim: SlotClaim | undefined
  let released = false
  f.api.ui.slot = (value) => { claim = value; return () => { released = true } }
  expect(plugin.id).toBe("openspec-tui")
  const stop = plugin.setup(f.api) as () => void
  expect(claim?.append).toBe("sidebar.content")
  expect(f.commands).toHaveLength(2)
  stop()
  expect(released).toBe(true)
})

test("locations prefer the displayed session over the context and default", () => {
  const f = fixture()
  f.api.data.session.get = () => ({ location: { directory: "/session-project", workspaceID: "workspace" } }) as any
  expect(projectLocation(f.api).directory).toBe("/session-project")
  f.state.route = { type: "home" }
  expect(projectLocation(f.api).directory).toBe("/project")
  const fallback = { ui: f.api.ui, data: { location: { default: () => ({ directory: "/default" }) } } } as Context
  expect(projectLocation(fallback).directory).toBe("/default")
})

test("theme tokens are read live", () => {
  const tokens = structuredClone(colors)
  expect(themeColors(tokens).accent).toBe("#00aaff")
  ;(tokens.hue.accent as any)[200] = "#00ffcc"
  expect(themeColors(tokens).accent).toBe("#00ffcc")
})

test("slot location changes dispose the old poll and scope all reads to the new project", async () => {
  const f = fixture()
  const [directory, setDirectory] = createSignal("/one")
  const reads: string[] = []
  const oldFetch = globalThis.fetch
  const oldInterval = globalThis.setInterval
  const oldClear = globalThis.clearInterval
  const intervals = new Set<ReturnType<typeof setInterval>>()
  globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => { const id = oldInterval(...args); intervals.add(id); return id }) as typeof setInterval
  globalThis.clearInterval = ((id: ReturnType<typeof setInterval>) => { intervals.delete(id); oldClear(id) }) as typeof clearInterval
  let claim!: Extract<SlotClaim, { append: "sidebar.content" }>
  const api = Object.assign(f.api, {
    theme: colors,
    storage: { store: () => [{ last: "dev" }, async () => {}] },
    renderer: { on() {}, off() {}, currentFocusedRenderable: null },
    client: {
      file: {
        list: async ({ location }: any) => { reads.push(location.directory); return { data: [] } },
        read: async ({ location }: any) => { reads.push(location.directory); return new Uint8Array() },
      },
      command: { list: async ({ location }: any) => { reads.push(location.directory); return { data: [] } } },
    },
  }) as Context
  api.data.session.get = () => ({ location: { directory: directory() } }) as any
  api.ui.slot = (value) => { claim = value as typeof claim; return () => {} }
  plugin.setup(api)
  const view = await testRender(() => claim.render({ sessionID: "a" }), { width: 46, height: 20 })
  try {
    await Bun.sleep(40)
    await view.renderOnce()
    expect(reads.length).toBeGreaterThan(0)
    expect(new Set(reads)).toEqual(new Set(["/one"]))
    expect(intervals.size).toBe(1)
    setDirectory("/two")
    await Bun.sleep(40)
    await view.renderOnce()
    expect(reads).toContain("/two")
    expect(intervals.size).toBe(1)
  } finally {
    view.renderer.destroy()
    expect(intervals.size).toBe(0)
    globalThis.fetch = oldFetch
    globalThis.setInterval = oldInterval
    globalThis.clearInterval = oldClear
  }
})


test("the local package exposes a TUI entrypoint without a server entrypoint", () => {
  const root = fileURLToPath(new URL("../", import.meta.url))
  const entry = Host.resolve({ directory: root })
  expect(entry.tui).toContain("dist/index.js")
  expect(entry.server).toBeUndefined()
})

test("an older OpenCode 2 host gets the minimum version before any commands load", () => {
  const { api, commands } = fixture()
  let message = ""
  Object.assign(api, { app: { version: "2.2.0" } })
  api.ui.dialog.alert = async (input) => { message = input.message }
  expect(plugin.setup(api)).toBeUndefined()
  expect(message).toContain("2.4.1")
  expect(commands).toHaveLength(0)
})
