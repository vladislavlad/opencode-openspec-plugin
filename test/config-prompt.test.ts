import { describe, expect, test } from "bun:test"
import { CONFIG_PROMPT } from "../src/lib/config-prompt"
import { buildInitPrompt } from "../src/lib/init-prompts"

describe("task breakdown granularity", () => {
  // Two modes, described by scope: hours mean nothing when a person and an agent share the checklist.
  test("offers High-level and Detailed", () => {
    for (const p of [CONFIG_PROMPT, buildInitPrompt()]) {
      expect(p).toContain('"High-level" (a few high-level tasks)')
      expect(p).toContain('"Detailed" (sub-tasks grouped under high-level sections)')
    }
  })

  test("maps each answer to a rule under rules.tasks", () => {
    expect(CONFIG_PROMPT).toContain("High-level = a few broad top-level tasks")
    expect(CONFIG_PROMPT).toContain("Detailed = sub-tasks grouped under high-level sections")
  })
})

describe("the config step", () => {
  const GUARD = "tell me to run OpenSpec init first and stop"

  // Standalone /opsx-config can land on an unprepared project; inside init, the install step right
  // above just created openspec/, so the same guard would only invite a pointless stop.
  test("guards on a missing openspec/ only when it runs on its own", () => {
    expect(CONFIG_PROMPT).toContain(GUARD)
    expect(buildInitPrompt()).not.toContain(GUARD)
  })

  test("keeps the plugin block when rewriting the file", () => {
    expect(CONFIG_PROMPT).toContain("keep any existing `plugin:` block byte-for-byte")
  })
})
