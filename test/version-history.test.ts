import { describe, expect, test } from "bun:test"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { decideMigration, pendingVersionRange, readLastVersion, recordVersion } from "../src/lib/version-history"
import { VERSION } from "../src/lib/version"

const KEY = "openspec.lastVersion"

function api(initial?: Record<string, unknown>) {
  const store: Record<string, unknown> = { ...initial }
  return {
    store,
    api: { kv: { get: (k: string) => store[k], set: (k: string, v: unknown) => void (store[k] = v) } } as unknown as TuiPluginApi,
  }
}

test("reads a stored version and ignores a missing or corrupt one", () => {
  expect(readLastVersion(api({ [KEY]: "0.3.0" }).api)).toBe("0.3.0")
  expect(readLastVersion(api().api)).toBeNull()
  expect(readLastVersion(api({ [KEY]: 42 }).api)).toBeNull()
  expect(readLastVersion(api({ [KEY]: "" }).api)).toBeNull()
})

test("recordVersion stamps the build constant", () => {
  const { store, api: a } = api()
  recordVersion(a)
  expect(store[KEY]).toBe(VERSION)
  expect(readLastVersion(a)).toBe(VERSION)
})

test("a lower stored version is an update that happened outside the sidebar", () => {
  expect(pendingVersionRange("0.3.0", "0.4.0")).toEqual({ old: "0.3.0", new: "0.4.0" })
  expect(pendingVersionRange("0.3.0", "0.3.1")).toEqual({ old: "0.3.0", new: "0.3.1" })
})

test("nothing to migrate on a first run, an unchanged version, or a downgrade", () => {
  // No record: we don't know where the user came from, so a range would be made up.
  expect(pendingVersionRange(null, "0.4.0")).toBeNull()
  expect(pendingVersionRange("0.4.0", "0.4.0")).toBeNull()
  expect(pendingVersionRange("0.5.0", "0.4.0")).toBeNull()
})

test("a dev checkout never announces anything — VERSION isn't a release number there", () => {
  expect(VERSION).toBe("dev")
  expect(pendingVersionRange("0.3.0")).toBeNull()
})

// The decision the sidebar renders, as a table. `hasEntries` is injected, so nothing here depends on
// the real MIGRATIONS contents.
describe("decideMigration", () => {
  const notes = () => true // the range has release notes
  const silent = () => false // a patch release with no MIGRATIONS entry
  const decide = (
    flag: { old: string; new: string } | null,
    last: string | null,
    hasEntries = notes,
    current = "0.4.0",
  ) => decideMigration({ flag, last, current, hasEntries })

  describe("the config.yaml flag wins over everything", () => {
    test("its build is the one running → offer Complete Update, and clear the flag afterwards", () => {
      expect(decide({ old: "0.3.0", new: "0.4.0" }, "0.3.0")).toEqual({
        show: "migrate",
        range: { old: "0.3.0", new: "0.4.0" },
        fromFlag: true,
      })
    })

    test("its build hasn't loaded → ask for a reopen, migrate nothing", () => {
      expect(decide({ old: "0.3.0", new: "0.9.0" }, "0.3.0")).toEqual({
        show: "reopen",
        range: { old: "0.3.0", new: "0.9.0" },
      })
    })

    test("it beats a kv drift pointing elsewhere — one banner, and `old` comes from the flag", () => {
      expect(decide({ old: "0.1.0", new: "0.4.0" }, "0.3.0")).toEqual({
        show: "migrate",
        range: { old: "0.1.0", new: "0.4.0" },
        fromFlag: true,
      })
    })

    test("nothing is recorded while an update is in flight", () => {
      // Both flag branches return a banner, never `{ show: "none" }` — so the caller never stamps kv
      // mid-update and can't lose the range.
      for (const flag of [{ old: "0.3.0", new: "0.4.0" }, { old: "0.3.0", new: "0.9.0" }]) {
        expect(decide(flag, "0.1.0").show).not.toBe("none")
      }
    })
  })

  describe("without a flag, kv drift is the source", () => {
    test("an update that bypassed the button → offer Complete Update without clearing a flag", () => {
      expect(decide(null, "0.3.0")).toEqual({
        show: "migrate",
        range: { old: "0.3.0", new: "0.4.0" },
        fromFlag: false,
      })
    })

    test("a release with nothing to announce is recorded, not shown", () => {
      expect(decide(null, "0.3.0", silent)).toEqual({ show: "none", record: true })
    })

    test("first run: no record to compare against, so record and stay quiet", () => {
      expect(decide(null, null)).toEqual({ show: "none", record: true })
    })

    test("a downgrade is recorded, not migrated backwards", () => {
      expect(decide(null, "0.5.0")).toEqual({ show: "none", record: true })
    })

    test("the version hasn't changed: nothing to show, nothing to write", () => {
      expect(decide(null, "0.4.0")).toEqual({ show: "none", record: false })
    })

    test("a dev checkout records once and then stays idle", () => {
      expect(decide(null, null, notes, "dev")).toEqual({ show: "none", record: true })
      expect(decide(null, "dev", notes, "dev")).toEqual({ show: "none", record: false })
    })
  })
})
