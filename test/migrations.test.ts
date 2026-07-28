import { expect, test } from "bun:test"
import { MIGRATIONS, buildMigrationPrompt, collectMigrations, hasMigrations } from "../src/lib/migrations"

const CLEAR_FLAG = "Remove the `plugin.update-in-progress` block"
const versions = Object.keys(MIGRATIONS).sort()
const oldest = versions[0]

test("collects the versions in (old, new], oldest first", () => {
  expect(collectMigrations("0.0.0", "999.0.0").map((m) => m.version)).toEqual(versions)
  // The boundary the range is named after is included; the one it started from is not.
  expect(collectMigrations(oldest, "999.0.0").map((m) => m.version)).not.toContain(oldest)
  expect(collectMigrations("0.0.0", oldest).map((m) => m.version)).toEqual([oldest])
})

test("hasMigrations tells a release worth announcing from a silent one", () => {
  expect(hasMigrations("0.0.0", "999.0.0")).toBe(true)
  expect(hasMigrations("999.0.0", "999.9.9")).toBe(false) // a patch with no entry
})

test("the flag instruction is opt-in, because a kv-detected range has no flag to clear", () => {
  const range = { old: "0.0.0", new: "999.0.0" }
  expect(buildMigrationPrompt(range, { clearFlag: true })).toContain(CLEAR_FLAG)
  expect(buildMigrationPrompt(range)).not.toContain(CLEAR_FLAG)
  expect(buildMigrationPrompt(range, { clearFlag: false })).not.toContain(CLEAR_FLAG)
})

test("the prompt names the range and asks for the notes to be relayed", () => {
  const p = buildMigrationPrompt({ old: "0.0.0", new: "999.0.0" })
  expect(p).toContain("updated from 0.0.0 to 999.0.0")
  expect(p).toContain("Write for the user these release notes grouped by version in language of the user in pretty format")
})

test("an empty range still produces a usable prompt", () => {
  const p = buildMigrationPrompt({ old: "999.0.0", new: "999.9.9" }, { clearFlag: true })
  expect(p).not.toContain("Execute these migration steps")
  expect(p).toContain(CLEAR_FLAG)
})

// Release notes are relayed to the user, so the same language rule applies as to the setup prompts.
test("the release notes are relayed in the user's language, terms untranslated", () => {
  const p = buildMigrationPrompt({ old: "0.0.0", new: "999.0.0" })
  expect(p).toContain("in the language the user writes to you in")
  expect(p).toContain("Never transliterate them")
})
