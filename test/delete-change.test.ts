import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { deleteChange } from "../src/lib/delete-change"

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "openspec-delete-test-"))
  const change = join(dir, "openspec/changes/example")
  await mkdir(change, { recursive: true })
  await writeFile(join(change, "tasks.md"), "- [ ] Keep this task")
  const prompts: string[] = []
  const api = {
    state: { path: { directory: dir } },
    client: { tui: { appendPrompt: async ({ text }: { text: string }) => { prompts.push(text) } } },
  } as unknown as TuiPluginApi
  return { dir, change, api, prompts, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

test.each(["busy", "retry"])("a %s guard keeps the change on disk", async () => {
  const f = await fixture()
  try {
    await deleteChange(f.api, "example", () => false)
    expect(await readFile(join(f.change, "tasks.md"), "utf8")).toBe("- [ ] Keep this task")
    expect(f.prompts).toEqual([])
  } finally { await f.cleanup() }
})

test("a session becoming busy during directory lookup prevents deletion", async () => {
  const f = await fixture()
  let checks = 0
  try {
    await deleteChange(f.api, "example", () => ++checks === 1)
    expect(checks).toBe(2)
    expect((await stat(f.change)).isDirectory()).toBe(true)
    expect(f.prompts).toEqual([])
  } finally { await f.cleanup() }
})

test("idle deletion removes local files and treats a missing change as success", async () => {
  const f = await fixture()
  try {
    await deleteChange(f.api, "example", () => true)
    expect(await stat(f.change).catch(() => null)).toBeNull()
    await deleteChange(f.api, "example", () => true)
    expect(f.prompts).toEqual([])
  } finally { await f.cleanup() }
})

test("remote deletion fills the prompt only if the session remains idle", async () => {
  const f = await fixture()
  f.api.state.path.directory = join(f.dir, "unavailable")
  try {
    await deleteChange(f.api, "example", () => false)
    expect(f.prompts).toEqual([])
    let checks = 0
    await deleteChange(f.api, "example", () => ++checks < 3)
    expect(checks).toBe(3)
    expect(f.prompts).toEqual([])
    await deleteChange(f.api, "example", () => true)
    expect(f.prompts).toEqual(["delete openspec change example"])
  } finally { await f.cleanup() }
})
