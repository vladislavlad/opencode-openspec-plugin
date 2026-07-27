import { describe, expect, test } from "bun:test"
import type { InitStage, InitState } from "../src/lib/config"
import { ephemeralBanner, initIncomplete, needsInit, setupStage } from "../src/components/init-flow"

const state = (inProgress: boolean, ...done: InitStage[]): InitState => ({ inProgress, done })
const idle = state(false)

describe("setupStage", () => {
  test("names the first stage the agent has not checkpointed", () => {
    expect(setupStage(state(true))).toBe("tooling")
    expect(setupStage(state(true, "tooling"))).toBe("config")
    expect(setupStage(state(true, "tooling", "config"))).toBe("specs")
  })

  test("falls through to validate once all three are recorded", () => {
    expect(setupStage(state(true, "tooling", "config", "specs"))).toBe("validate")
  })
})

describe("initIncomplete", () => {
  const stopped = { init: state(true, "tooling"), busy: false, setupInProgress: false }

  test("shows once tooling is checkpointed and nothing is running", () => {
    expect(initIncomplete(stopped)).toBe(true)
  })

  // Before the tooling checkpoint the Init screen owns the view, so the banner would compete with it.
  test("waits for the tooling checkpoint", () => {
    expect(initIncomplete({ ...stopped, init: state(true) })).toBe(false)
  })

  test("stays hidden while a turn or a setup is running", () => {
    expect(initIncomplete({ ...stopped, busy: true })).toBe(false)
    expect(initIncomplete({ ...stopped, setupInProgress: true })).toBe(false)
  })

  test("stays hidden with no marker at all", () => {
    expect(initIncomplete({ ...stopped, init: idle })).toBe(false)
  })
})

describe("needsInit", () => {
  test("takes the screen when the tooling is missing", () => {
    expect(needsInit({ initialised: false, init: idle })).toBe(true)
  })

  // Directories can exist from an aborted run – the checkpoint, not the files, says setup got there.
  test("takes the screen when setup never reached the tooling checkpoint", () => {
    expect(needsInit({ initialised: true, init: state(true) })).toBe(true)
  })

  test("yields once tooling is checkpointed", () => {
    expect(needsInit({ initialised: true, init: state(true, "tooling") })).toBe(false)
  })

  test("holds off while the first load is still in flight", () => {
    expect(needsInit({ initialised: null, init: idle })).toBe(false)
  })
})

describe("ephemeralBanner", () => {
  const base = { busy: false, commandsReady: false, init: idle, ephemeral: "loaded" as const }

  test("prompts a restart whether the bridge took or not", () => {
    expect(ephemeralBanner(base)).toBe("warn")
    expect(ephemeralBanner({ ...base, ephemeral: "failed" })).toBe("error")
  })

  test("says nothing before anything was bridged", () => {
    expect(ephemeralBanner({ ...base, ephemeral: "idle" })).toBe("none")
  })

  test("says nothing while the agent works or once the commands load natively", () => {
    expect(ephemeralBanner({ ...base, busy: true })).toBe("none")
    expect(ephemeralBanner({ ...base, commandsReady: true })).toBe("none")
  })

  // Held back during setup so the Reload and Resume buttons never compete for the same spot.
  test("stays quiet until setup is finished or dismissed", () => {
    expect(ephemeralBanner({ ...base, init: state(true, "tooling") })).toBe("none")
  })
})
