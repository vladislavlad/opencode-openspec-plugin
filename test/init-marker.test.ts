import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { clearInitMarker, readPluginState, writeInitMarker } from "../src/lib/config"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "openspec-marker-"))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

// Writing only needs the project directory — the file itself is read and written through node:fs.
const api = (directory = dir) => ({ state: { path: { directory } } }) as unknown as TuiPluginApi

const config = () => readFile(join(dir, "openspec/config.yaml"), "utf8")
const state = () => readPluginState({ list: async () => [], read: async (p) => readFile(join(dir, p), "utf8").catch(() => "") })

async function seed(content: string) {
  await mkdir(join(dir, "openspec"), { recursive: true })
  await writeFile(join(dir, "openspec/config.yaml"), content, "utf8")
}

describe("writeInitMarker", () => {
  test("creates the directory and file when the project has no openspec/ yet", async () => {
    expect(await writeInitMarker(api(), true)).toBe(true)
    expect(await config()).toContain("schema: spec-driven")
    expect(await state()).toEqual({ init: { inProgress: true, done: [] }, update: null })
  })

  test("keeps existing context, rules and comments intact", async () => {
    await seed(["# hand-written", "schema: spec-driven", "context: |", "  Tech stack: TypeScript", "rules:", "  tasks:", "    - keep them small", ""].join("\n"))
    expect(await writeInitMarker(api(), true)).toBe(true)

    const out = await config()
    expect(out).toContain("# hand-written")
    expect(out).toContain("Tech stack: TypeScript")
    expect(out).toContain("- keep them small")
    expect((await state()).init.inProgress).toBe(true)
  })

  test("resume keeps the recorded stages, a fresh init clears them", async () => {
    await seed('schema: spec-driven\nplugin:\n  init:\n    in-progress: false\n    done: ["tooling", "config"]\n')

    await writeInitMarker(api(), false) // resume
    expect(await state()).toMatchObject({ init: { inProgress: true, done: ["tooling", "config"] } })

    await writeInitMarker(api(), true) // start over
    expect(await state()).toMatchObject({ init: { inProgress: true, done: [] } })
  })

  test("leaves the post-update flag alone", async () => {
    await seed("plugin:\n  update-in-progress:\n    old: 0.2.1\n    new: 0.3.0\n")
    await writeInitMarker(api(), true)
    expect(await state()).toEqual({ update: { old: "0.2.1", new: "0.3.0" }, init: { inProgress: true, done: [] } })
  })


  test("refuses when the project directory isn't on this machine", async () => {
    expect(await writeInitMarker(api(join(dir, "nope")), true)).toBe(false)
  })

  test("refuses on malformed yaml rather than clobbering it", async () => {
    await seed("plugin: [unclosed\n")
    expect(await writeInitMarker(api(), true)).toBe(false)
    expect(await config()).toBe("plugin: [unclosed\n")
  })
})

describe("clearInitMarker", () => {
  test("drops the init block and the empty plugin block with it", async () => {
    await seed("schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\nplugin:\n  init:\n    in-progress: true\n    done: []\n")
    expect(await clearInitMarker(api())).toBe(true)

    const out = await config()
    expect(out).toContain("Tech stack: TypeScript")
    expect(out).not.toContain("plugin:")
    expect(await state()).toEqual({ init: { inProgress: false, done: [] }, update: null })
  })

  test("keeps the plugin block when the post-update flag is still in it", async () => {
    await seed('plugin:\n  init:\n    in-progress: true\n    done: ["tooling"]\n  update-in-progress:\n    old: 0.2.1\n    new: 0.3.0\n')
    expect(await clearInitMarker(api())).toBe(true)
    expect(await state()).toEqual({ init: { inProgress: false, done: [] }, update: { old: "0.2.1", new: "0.3.0" } })
  })

  test("is a no-op when there is no config or no marker", async () => {
    expect(await clearInitMarker(api())).toBe(true)
    await seed("schema: spec-driven\n")
    expect(await clearInitMarker(api())).toBe(true)
    expect(await config()).toContain("schema: spec-driven")
  })

  test("falls back to the agent when it can't reach or read the file", async () => {
    expect(await clearInitMarker(api(join(dir, "nope")))).toBe(false)
    await seed("plugin: [unclosed\n")
    expect(await clearInitMarker(api())).toBe(false)
    expect(await config()).toBe("plugin: [unclosed\n")
  })
})
