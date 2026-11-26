import { expect, test } from "bun:test"
import { buildUpdatePrompt } from "../src/lib/update-prompt"
import { collectMigrations } from "../src/lib/migrations"

test("V2 updater preserves CLI config objects and guards host compatibility", () => {
  const text = buildUpdatePrompt({ plugin: { current: "2.0.0", next: "2.0.1" } })
  for (const token of ["cli.json", "XDG_CONFIG_HOME", "OPENCODE_CONFIG_DIR", "OPENCODE_CLI_CONFIG_CONTENT", '"plugins"', "package", "preserve options", "comments", "SKIP", ">=2.4.1", "old: 2.0.0", "new: 2.0.1"]) expect(text).toContain(token)
  expect(text).toContain("@vladislavlad/opencode-v2-openspec-plugin@2.0.1")
  expect(text).not.toContain("tuple")
})

test("the V2 release has one set of user-facing notes without data migration", () => {
  const entries = collectMigrations("1.0.0", "2.0.0")
  expect(entries).toHaveLength(1)
  expect(entries[0]?.instructions).toBe("")
  expect(entries[0]?.releaseNotes.join(" ")).toContain("OpenCode 2")
})
