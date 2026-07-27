import { describe, expect, test } from "bun:test"
import { INIT_DISMISS_PROMPT, NO_STAGES_DONE, buildInitOnlyPrompt, buildInitPrompt } from "../src/lib/init-prompts"

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

describe("a cancelled CLI install", () => {
  // The agent never saw the project before the turn, so cleanup has to be a rule it can check.
  test("cleans up by a checkable rule and ends the turn", () => {
    for (const p of [buildInitPrompt(NO_STAGES_DONE, true), buildInitOnlyPrompt(true)]) {
      expect(p).toContain("if the file then holds nothing but `schema`, delete it")
      expect(p).toContain("if `openspec/` is then empty, remove the directory too")
      expect(p).not.toContain("exist only for this setup")
    }
  })

  // The marker instruction sits on the failing step itself – a small model won't connect a stop at
  // step 6 with an explanation a hundred lines later in Finally.
  test("a failed init says on the spot that the marker stays for Resume", () => {
    const p = buildInitPrompt()
    expect(p).toContain("leave `openspec/config.yaml` and its marker as they are (the sidebar will offer Resume)")
  })

  test("failed validation keeps the marker and ends the turn before the greeting", () => {
    expect(buildInitPrompt()).toContain("leave the `init:` block in place (the sidebar will offer Resume), report what is broken, and end the turn")
  })

  // Finally is tailored to the steps this build actually contains – no references to absent steps.
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

  // Derivation is a judgement call over a codebase, so a first pass can miss things – and re-running
  // it is safe by the derive guardrails ("Idempotent: re-running refines, never duplicates").
  test("the greeting says a partial derivation can be topped up", () => {
    expect(buildInitPrompt()).toContain("if the specs don't cover the whole project yet, running it again refines and extends")
  })
})

describe("the derive gate inside init", () => {
  // Init folds the depth into the gate question, so the user answers once instead of twice – and the
  // derive body itself carries no question either way.
  test("carries the depth in the gate instead of a question of its own", () => {
    const p = buildInitPrompt()
    expect(p).toContain('"Yes – Overview", "Yes – Deep" and "No"')
    expect(p).toContain("much slower and far more tokens")
    expect(p).not.toContain('header "Depth"')
    expect(p.indexOf('"Yes – Deep"')).toBeLessThan(p.indexOf("Phase 1 – Orient"))
  })

  test("a resume that skips the specs stage asks nothing about depth", () => {
    const p = buildInitPrompt({ tooling: true, config: true, specs: true })
    expect(p).not.toContain('header "Depth"')
    expect(p).not.toContain('"Yes – Deep"')
  })
})
