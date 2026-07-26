import { describe, expect, test } from "bun:test"
import { readInitFlag, readUpdateFlag } from "../src/lib/updates"
import type { FileClient } from "../src/lib/openspec"

function mockClient(read: Record<string, string>): FileClient {
  return {
    list: async () => [],
    read: async (path) => read[path] ?? "",
  }
}

describe("readInitFlag", () => {
  test("reads the marker written before install, with no stage done yet", async () => {
    const client = mockClient({
      "openspec/config.yaml": "schema: spec-driven\nplugin:\n  init:\n    in-progress: true\n    done: []\n",
    })
    expect(await readInitFlag(client)).toEqual({ inProgress: true, done: [] })
  })

  test("reads the checkpointed stages in order", async () => {
    const client = mockClient({
      "openspec/config.yaml": 'plugin:\n  init:\n    in-progress: true\n    done: ["tooling", "config"]\n',
    })
    expect(await readInitFlag(client)).toEqual({ inProgress: true, done: ["tooling", "config"] })
  })

  test("clears once the agent drops the init block", async () => {
    const client = mockClient({ "openspec/config.yaml": "schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\n" })
    expect(await readInitFlag(client)).toEqual({ inProgress: false, done: [] })
  })

  test("falls back to the .openspec root", async () => {
    const client = mockClient({ ".openspec/config.yaml": 'plugin:\n  init:\n    in-progress: true\n    done: ["tooling"]\n' })
    expect(await readInitFlag(client)).toEqual({ inProgress: true, done: ["tooling"] })
  })

  test("treats a missing or malformed config as no marker", async () => {
    expect(await readInitFlag(mockClient({}))).toEqual({ inProgress: false, done: [] })
    expect(await readInitFlag(mockClient({ "openspec/config.yaml": "plugin: [unclosed\n" }))).toEqual({
      inProgress: false,
      done: [],
    })
  })

  test("drops unknown stage names and a non-list done", async () => {
    const bogus = mockClient({ "openspec/config.yaml": 'plugin:\n  init:\n    in-progress: true\n    done: ["tooling", "nope"]\n' })
    expect(await readInitFlag(bogus)).toEqual({ inProgress: true, done: ["tooling"] })
    const notAList = mockClient({ "openspec/config.yaml": "plugin:\n  init:\n    in-progress: true\n    done: tooling\n" })
    expect(await readInitFlag(notAList)).toEqual({ inProgress: true, done: [] })
  })

  test("stages survive without the in-progress flag", async () => {
    const client = mockClient({ "openspec/config.yaml": 'plugin:\n  init:\n    done: ["tooling"]\n' })
    expect(await readInitFlag(client)).toEqual({ inProgress: false, done: ["tooling"] })
  })
})

describe("readUpdateFlag", () => {
  test("reads the version range", async () => {
    const client = mockClient({
      "openspec/config.yaml": "plugin:\n  update-in-progress:\n    old: 0.2.1\n    new: 0.3.0\n",
    })
    expect(await readUpdateFlag(client)).toEqual({ old: "0.2.1", new: "0.3.0" })
  })

  test("coexists with the init marker", async () => {
    const client = mockClient({
      "openspec/config.yaml":
        'plugin:\n  init:\n    in-progress: true\n    done: ["tooling"]\n  update-in-progress:\n    old: 0.2.1\n    new: 0.3.0\n',
    })
    expect(await readUpdateFlag(client)).toEqual({ old: "0.2.1", new: "0.3.0" })
    expect(await readInitFlag(client)).toEqual({ inProgress: true, done: ["tooling"] })
  })

  test("is null without a config or a flag", async () => {
    expect(await readUpdateFlag(mockClient({}))).toBeNull()
    expect(await readUpdateFlag(mockClient({ "openspec/config.yaml": "schema: spec-driven\n" }))).toBeNull()
  })
})
