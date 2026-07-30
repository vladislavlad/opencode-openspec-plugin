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

describe("writing style", () => {
  // Three points on one axis, so "Balanced" says between what and what.
  test("describes every option", () => {
    for (const p of [CONFIG_PROMPT, buildInitPrompt()]) {
      expect(p).toContain('"Technical" (precise, implementation-focused)')
      expect(p).toContain('"Product" (outcome-focused, user-oriented)')
      expect(p).toContain('"Balanced" (technical precision where it matters, readable by non-engineers)')
    }
  })

  // The style survives the setup turn as one line of `context`; the agent generating artifacts later
  // reads that line and nothing else, so the meaning has to travel with the name.
  test("persists the style with its meaning", () => {
    expect(CONFIG_PROMPT).toContain(
      "Writing style: Balanced (technical precision where it matters, readable by non-engineers)",
    )
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

describe("spec structure", () => {
  // Named by the layout each one writes, because that is the whole difference between them.
  // Two options, named by the layout each writes. No "Auto": it asked the user to choose between a
  // preference and a non-answer, and derive looks at the files anyway when the two disagree.
  test("offers Flat and Hierarchical by their directory layout, and nothing else", () => {
    for (const p of [CONFIG_PROMPT, buildInitPrompt()]) {
      expect(p).toContain("`specs/<capability>/spec.md`")
      expect(p).toContain("`specs/<area>/<capability>/spec.md`")
      expect(p).not.toContain('"Auto"')
    }
  })

  test("persists the answer as a specStructure line in context", () => {
    expect(CONFIG_PROMPT).toContain("`specStructure: hierarchical`")
    expect(CONFIG_PROMPT).not.toContain("specStructure: auto")
  })
})
