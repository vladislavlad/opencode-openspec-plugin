import { describe, expect, test } from "bun:test"
import {
  CONFIG_PROMPT,
  INIT_DISMISS_PROMPT,
  NO_STAGES_DONE,
  SPEC_BASELINE_PROMPT,
  buildInitOnlyPrompt,
  buildInitPrompt,
} from "../src/lib/prompts"

// Anchors for the stages the builder can include or skip.
const INIT_CMD = "openspec init --tools opencode"
const INSTALL_STEP = "## Install step"
const CONFIG_STEP = "## Config step"
const SPECS_STEP = "## Specs step"
const CLEAR = "remove the whole `init:` block"

describe("buildInitPrompt", () => {
  test("a fresh run writes the marker before installing, then every stage", () => {
    const p = buildInitPrompt()
    // The marker has to precede the install so an interrupted install is still recoverable.
    expect(p.indexOf("in-progress: true")).toBeLessThan(p.indexOf(INIT_CMD))
    expect(p).toContain(INSTALL_STEP)
    expect(p).toContain(CONFIG_STEP)
    expect(p).toContain(SPECS_STEP)
    expect(p).not.toContain("Resume the interrupted")
  })

  test("checkpoints each stage cumulatively", () => {
    const p = buildInitPrompt()
    expect(p).toContain('`plugin.init.done` in `openspec/config.yaml` to `["tooling"]`')
    expect(p).toContain('`["tooling", "config"]`')
    expect(p).toContain('`["tooling", "config", "specs"]`')
  })

  test("resume after tooling skips install and init", () => {
    const p = buildInitPrompt({ ...NO_STAGES_DONE, tooling: true })
    expect(p).toContain("Resume the interrupted")
    expect(p).not.toContain(INIT_CMD)
    expect(p).toContain("do NOT run `openspec init` again")
    expect(p).toContain(CONFIG_STEP)
    expect(p).toContain(SPECS_STEP)
  })

  test("resume after config skips the questionnaire too", () => {
    const p = buildInitPrompt({ tooling: true, config: true, specs: false })
    expect(p).not.toContain(INIT_CMD)
    expect(p).not.toContain(CONFIG_STEP)
    expect(p).toContain("leave its `context` and `rules` as they are")
    expect(p).toContain(SPECS_STEP)
  })

  test("resume after specs only validates and clears", () => {
    const p = buildInitPrompt({ tooling: true, config: true, specs: true })
    expect(p).not.toContain(INIT_CMD)
    expect(p).not.toContain(CONFIG_STEP)
    expect(p).not.toContain(SPECS_STEP)
    expect(p).toContain("openspec validate --specs")
    expect(p).toContain(CLEAR)
  })

  test("missing tooling still reinstalls even when later stages were done", () => {
    const p = buildInitPrompt({ tooling: false, config: true, specs: true })
    expect(p).toContain(INIT_CMD)
    expect(p).not.toContain(CONFIG_STEP)
  })

  test("every variant ends by clearing the marker", () => {
    for (const done of [
      NO_STAGES_DONE,
      { tooling: true, config: false, specs: false },
      { tooling: true, config: true, specs: false },
      { tooling: true, config: true, specs: true },
    ]) {
      expect(buildInitPrompt(done)).toContain(CLEAR)
    }
  })
})

describe("standalone init prompts", () => {
  test("Dismiss only clears the marker", () => {
    expect(INIT_DISMISS_PROMPT).toContain(CLEAR)
    expect(INIT_DISMISS_PROMPT).not.toContain(CONFIG_STEP)
    expect(INIT_DISMISS_PROMPT).not.toContain(INIT_CMD)
  })

  test("the no-baseline fallback installs and still clears the marker", () => {
    const p = buildInitOnlyPrompt()
    expect(p).toContain(INIT_CMD)
    expect(p).toContain(CLEAR)
    expect(p).not.toContain(SPECS_STEP)
  })
})

describe("the pre-written marker", () => {
  // The sidebar stamps `plugin.init` itself when it can reach the files, so the agent is told to
  // leave it alone instead of being handed the yaml to write.
  test("replaces the write instruction, in both builders", () => {
    for (const p of [buildInitPrompt(NO_STAGES_DONE, true), buildInitOnlyPrompt(true)]) {
      expect(p).toContain("the sidebar wrote it")
      expect(p).not.toContain("in-progress: true")
      expect(p).toContain(INIT_CMD) // the rest of the preflight is untouched
    }
  })

  test("falls back to the full instruction when the sidebar could not write", () => {
    for (const p of [buildInitPrompt(NO_STAGES_DONE, false), buildInitOnlyPrompt(false)]) {
      expect(p).toContain("in-progress: true")
      expect(p).not.toContain("the sidebar wrote it")
    }
  })
})

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

describe("the user's language", () => {
  const GUARD = "Write questions, options and summaries in the language the user writes to you in"

  test("every prompt that asks something carries the guard", () => {
    for (const p of [CONFIG_PROMPT, SPEC_BASELINE_PROMPT, buildInitPrompt(), buildInitOnlyPrompt()]) {
      expect(p).toContain(GUARD)
      expect(p).toContain("Never transliterate them")
    }
  })

  // Init embeds the config and derive bodies, so the guard must not come along with each of them.
  test("init states it once, not once per embedded step", () => {
    expect(buildInitPrompt().split(GUARD)).toHaveLength(2)
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
})

describe("a cancelled CLI install", () => {
  // The agent never saw the project before the turn, so cleanup has to be a rule it can check.
  test("cleans up by a checkable rule and ends the turn", () => {
    for (const p of [buildInitPrompt(NO_STAGES_DONE, true), buildInitOnlyPrompt(true)]) {
      expect(p).toContain("if the file then holds nothing but `schema`, delete it")
      expect(p).toContain("if `openspec/` is then empty, remove the directory too")
      expect(p).not.toContain("exist only for this setup")
    }
  })

  // The marker instruction sits on the failing step itself — a small model won't connect a stop at
  // step 6 with an explanation a hundred lines later in Finally.
  test("a failed init says on the spot that the marker stays for Resume", () => {
    const p = buildInitPrompt()
    expect(p).toContain("leave `openspec/config.yaml` and its marker as they are (the sidebar will offer Resume)")
  })

  test("failed validation keeps the marker and ends the turn before the greeting", () => {
    expect(buildInitPrompt()).toContain("leave the `init:` block in place (the sidebar will offer Resume), report what is broken, and end the turn")
  })

  // Finally is tailored to the steps this build actually contains — no references to absent steps.
  test("Finally drops mentions of steps a resume left out", () => {
    const afterTooling = buildInitPrompt({ tooling: true, config: false, specs: false })
    expect(afterTooling).not.toContain("a cancelled install")
    const afterSpecs = buildInitPrompt({ tooling: true, config: true, specs: true })
    expect(afterSpecs).not.toContain('answered "No"')
  })

  test("success ends with a greeting before the two start buttons", () => {
    const p = buildInitPrompt()
    expect(p).toContain("Tell the user OpenSpec is set up and ready")
    expect(p).toContain("**Explore**")
    expect(p).toContain("**Propose**")
  })

  // Derivation is a judgement call over a codebase, so a first pass can miss things — and re-running
  // it is safe by the derive guardrails ("Idempotent: re-running refines, never duplicates").
  test("the greeting says a partial derivation can be topped up", () => {
    expect(buildInitPrompt()).toContain("if the specs don't cover the whole project yet, running it again refines and extends")
  })

  // Phase 2 is a multi-select over the capability list; an empty list needs an exit, not a question.
  // The exit is narrow on purpose: a compose/manifest repo read it as "no application code" and bailed.
  test("only a truly empty directory exits the derive phases", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Skip Phases 2-4 only when the directory is empty or holds nothing but a README")
    expect(SPEC_BASELINE_PROMPT).toContain("config files, manifests and scripts are capabilities")
  })

  // Agent type names differ per host — "general-purpose" is a Claude Code name and opencode rejects
  // it. The tool lists its own valid types, so the prompt must not name one.
  test("the detail phase names no agent type of its own", () => {
    expect(SPEC_BASELINE_PROMPT).not.toContain("general-purpose")
    expect(SPEC_BASELINE_PROMPT).toContain("Take the agent type from the list that tool itself offers")
    expect(SPEC_BASELINE_PROMPT).toContain("do not retry with a guessed type")
  })

  // A 27b model rendered the capability list as single-select: "(multi-select)" in parentheses reads
  // as a remark, so both places now say it as an instruction.
  test("multiple selection is an instruction, not a parenthetical", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Turn multiple selection ON: the user has to be able to pick several options at once, not one")
    expect(CONFIG_PROMPT).toContain('"Stack" and "Context" must have multiple selection turned ON')
  })

  test("the confirm question asks about the listed capabilities, not extra ones", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("which of the capabilities you just listed should get specs")
  })

  test("an infrastructure repo is in scope for derivation", () => {
    expect(SPEC_BASELINE_PROMPT).toContain("Not every project is an application")
    expect(SPEC_BASELINE_PROMPT).toContain("the declared setup is the behavior")
  })
})

describe("derive depth", () => {
  // Asked before anything is read: working out the capability list is already studying the code, so
  // the depth has to be settled first.
  test("/opsx-baseline asks for it ahead of the orientation pass", () => {
    expect(SPEC_BASELINE_PROMPT).toContain('header "Depth"')
    expect(SPEC_BASELINE_PROMPT).toContain("much slower and far more tokens")
    expect(SPEC_BASELINE_PROMPT.indexOf('header "Depth"')).toBeLessThan(SPEC_BASELINE_PROMPT.indexOf("Phase 1 — Orient"))
  })

  // Init folds the depth into the gate question, so the user answers once instead of twice — and the
  // derive body itself carries no question either way.
  test("init carries it in the derive gate instead", () => {
    const p = buildInitPrompt()
    expect(p).toContain('"Yes — Overview", "Yes — Deep" and "No"')
    expect(p).toContain("much slower and far more tokens")
    expect(p).not.toContain('header "Depth"')
    expect(p.indexOf('"Yes — Deep"')).toBeLessThan(p.indexOf("Phase 1 — Orient"))
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

  test("a resume that skips the specs stage asks nothing about depth", () => {
    const p = buildInitPrompt({ tooling: true, config: true, specs: true })
    expect(p).not.toContain('header "Depth"')
    expect(p).not.toContain('"Yes — Deep"')
  })
})
