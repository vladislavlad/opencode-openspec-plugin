import { describe, expect, test } from "bun:test"
import { INIT_DISMISS_PROMPT, NO_STAGES_DONE, OPENSPEC_INIT_ONLY_PROMPT, buildInitPrompt } from "../src/lib/prompts"

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
    expect(OPENSPEC_INIT_ONLY_PROMPT).toContain(INIT_CMD)
    expect(OPENSPEC_INIT_ONLY_PROMPT).toContain(CLEAR)
    expect(OPENSPEC_INIT_ONLY_PROMPT).not.toContain(SPECS_STEP)
  })
})
