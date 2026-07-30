import { describe, expect, test } from "bun:test"
import { CONFIG_PROMPT } from "../src/lib/config-prompt"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"
import { buildInitOnlyPrompt, buildInitPrompt } from "../src/lib/init-prompts"
import { buildMigrationPrompt } from "../src/lib/migrations"
import { SPEC_LANGUAGE_RULE } from "../src/lib/prompt-style"

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

  // Both call sites render the same shared clause – that's the point of hoisting it.
  test("both call sites word the rule identically", () => {
    const RULE = "the user has to be able to pick several options at once, not one"
    expect(SPEC_BASELINE_PROMPT).toContain(RULE)
    expect(CONFIG_PROMPT).toContain(RULE)
  })
})

describe("the spec language rule", () => {
  // The names after `Requirement:` and `Scenario:` used to sit in a gap: prose by nature, but adjacent
  // to a marker the rule listed as keep-unchanged. Subagents read the whole heading as structural, and
  // a real project came out with five specs of thirty-five named entirely in English, bodies Russian.
  test("names the requirement and scenario names as prose, not as part of the marker", () => {
    expect(SPEC_LANGUAGE_RULE).toContain("the requirement's own name after `Requirement:`")
    expect(SPEC_LANGUAGE_RULE).toContain("the scenario's name after `Scenario:`")
    expect(SPEC_LANGUAGE_RULE).toContain("A marker is the marker alone")
    expect(SPEC_LANGUAGE_RULE).toContain("Never leave a heading in English because the marker in front of it is English")
  })

  // Both call sites render the same clause – config writes it into `context`, derive hands it to the
  // subagents. Copied by hand they would drift, which is why it is hoisted at all.
  test("reaches both call sites identically", () => {
    for (const p of [CONFIG_PROMPT, buildInitPrompt(), SPEC_BASELINE_PROMPT]) {
      expect(p).toContain(SPEC_LANGUAGE_RULE)
    }
  })

  // Naming the language is not the same as handing over the policy: the subagent writes the headings
  // and never sees the derive prompt.
  test("derive passes the rule to its subagents, not just the language name", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("pass the spec language together with the language rule above, copied out in full")
    expect(SPEC_BASELINE_PROMPT).toContain("naming the language alone is not enough")
  })

  test("config writes it into context without paraphrasing", () => {
    expect(CONFIG_PROMPT).toContain("copied verbatim")
    expect(CONFIG_PROMPT).toContain("don't paraphrase or shorten them")
  })
})
