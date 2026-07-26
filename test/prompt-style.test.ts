import { describe, expect, test } from "bun:test"
import { CONFIG_PROMPT } from "../src/lib/config-prompt"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"
import { buildInitOnlyPrompt, buildInitPrompt } from "../src/lib/init-prompts"
import { buildMigrationPrompt } from "../src/lib/migrations"

describe("the user's language", () => {
  const GUARD = "Write questions, options and summaries in the language the user writes to you in"

  test("every prompt that asks something carries the guard", () => {
    for (const p of [CONFIG_PROMPT, SPEC_BASELINE_PROMPT, buildInitPrompt(), buildInitOnlyPrompt()]) {
      expect(p).toContain(GUARD)
      expect(p).toContain("Never transliterate them")
    }
  })

  // Release notes are relayed to the user, so the migration prompt needs the guard as much as the
  // ones that ask questions.
  test("the migration prompt carries it too", () => {
    expect(buildMigrationPrompt({ old: "0.1.0", new: "0.2.0" })).toContain(GUARD)
  })

  // Init embeds the config and derive bodies, so the guard must not come along with each of them.
  test("init states it once, not once per embedded step", () => {
    expect(buildInitPrompt().split(GUARD)).toHaveLength(2)
  })
})

describe("multiple selection", () => {
  // A 27b model rendered the capability list as single-select: "(multi-select)" in parentheses reads
  // as a remark, so both places now say it as an instruction.
  test("is an instruction, not a parenthetical", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Turn multiple selection ON: the user has to be able to pick several options at once, not one")
    expect(CONFIG_PROMPT).toContain('"Stack" and "Context" must have multiple selection turned ON')
  })

  // Both call sites render the same shared clause — that's the point of hoisting it.
  test("both call sites word the rule identically", () => {
    const RULE = "the user has to be able to pick several options at once, not one"
    expect(SPEC_BASELINE_PROMPT).toContain(RULE)
    expect(CONFIG_PROMPT).toContain(RULE)
  })
})
