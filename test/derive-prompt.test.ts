import { describe, expect, test } from "bun:test"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"

describe("what derivation looks for", () => {
  // Phase 2 is a multi-select over the capability list; an empty list needs an exit, not a question.
  // The exit is narrow on purpose: a compose/manifest repo read it as "no application code" and bailed.
  test("only a truly empty directory exits the derive phases", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Skip Phases 2-4 only when the directory is empty or holds nothing but a README")
    expect(SPEC_BASELINE_PROMPT).toContain("config files, manifests and scripts are capabilities")
  })

  test("an infrastructure repo is in scope for derivation", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Not every project is an application")
    expect(SPEC_BASELINE_PROMPT).toContain("the declared setup is the behavior")
  })

  test("the confirm question asks about the listed capabilities, not extra ones", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("which of the capabilities you just listed should get specs")
  })

  // Agent type names differ per host – "general-purpose" is a Claude Code name and opencode rejects
  // it. The tool lists its own valid types, so the prompt must not name one.
  test("the detail phase names no agent type of its own", () => {
    expect(SPEC_BASELINE_PROMPT).not.toContain("general-purpose")
    expect(SPEC_BASELINE_PROMPT).toContain("Take the agent type from the list that tool itself offers")
    expect(SPEC_BASELINE_PROMPT).toContain("do not retry with a guessed type")
  })

  test("the checkpoint carve-out keeps changes and code off limits", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Edit `openspec/config.yaml` only where this prompt explicitly says to")
    expect(SPEC_BASELINE_PROMPT).toContain("Never touch `openspec/changes/` or code")
  })
})

describe("derive depth", () => {
  // Asked before anything is read: working out the capability list is already studying the code, so
  // the depth has to be settled first.
  test("/opsx-baseline asks for it ahead of the orientation pass", () => {
    expect(SPEC_BASELINE_PROMPT).toContain('header "Depth"')
    expect(SPEC_BASELINE_PROMPT).toContain("much slower and far more tokens")
    expect(SPEC_BASELINE_PROMPT.indexOf('header "Depth"')).toBeLessThan(SPEC_BASELINE_PROMPT.indexOf("Phase 1 – Orient"))
  })

  test("steers both the orientation pass and the subagent that details a capability", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("also read through each area's code instead of guessing capabilities from folder names")
    expect(SPEC_BASELINE_PROMPT).toContain("chosen depth")
    expect(SPEC_BASELINE_PROMPT).toContain('On "Overview" it reads entry points and main modules')
    expect(SPEC_BASELINE_PROMPT).toContain('on "Deep" it follows that capability\'s code paths end to end')
  })

  // "Deep" is a depth of reading, not a mandate to open everything in the repo.
  test("says outright that Deep is not every file", () => {
    expect(SPEC_BASELINE_PROMPT).toContain('"Deep" is not "open every file"')
    expect(SPEC_BASELINE_PROMPT).toContain("skip tests, fixtures, generated and vendored code")
  })
})
