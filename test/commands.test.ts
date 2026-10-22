import { expect, test } from "bun:test"
import { Keymap } from "@opentui/keymap"
import type { TuiPluginApi, TuiRouteCurrent, TuiToast } from "@opencode-ai/plugin/tui"
import { registerCommands, registerOpsxFsCommands } from "../src/features/commands"
import { CONFIG_PROMPT } from "../src/lib/config-prompt"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"

// Use the real V1 dispatcher so a handler cannot accidentally accept a string in place of context.
function fixture() {
  const unsubscribe = () => () => {}
  let destroy = () => {}
  const keymap = new Keymap({
    metadata: { platform: "macos", primaryModifier: "super", modifiers: { ctrl: "supported", shift: "supported", meta: "supported", super: "supported", hyper: "unsupported" } },
    rootTarget: {},
    isDestroyed: false,
    getFocusedTarget: () => null,
    getParentTarget: () => null,
    isTargetDestroyed: () => false,
    onKeyPress: unsubscribe,
    onKeyRelease: unsubscribe,
    onFocusChange: unsubscribe,
    onDestroy: (listener) => { destroy = listener; return () => {} },
    onTargetDestroy: unsubscribe,
    createCommandEvent: () => ({ name: "", ctrl: false, shift: false, meta: false, propagationStopped: false, preventDefault() {}, stopPropagation() {} }),
  })
  const calls: string[] = []
  const toasts: TuiToast[] = []
  const queried: string[] = []
  const route: { current: TuiRouteCurrent } = { current: { name: "session", params: { sessionID: "session-a" } } }
  const status: Record<string, string> = { "session-a": "idle" }
  let draft = "existing user draft"
  const api = {
    keymap, route,
    state: { path: { directory: "/project" }, session: { status: (id: string) => { queried.push(id); return { type: status[id] } } } },
    ui: { toast: (toast: TuiToast) => toasts.push(toast) },
    client: { tui: {
      clearPrompt: async () => { calls.push("clear"); draft = "" },
      appendPrompt: async ({ text }: { text: string }) => { calls.push("append"); draft += text },
      submitPrompt: async () => { calls.push("submit") },
    } },
  } as unknown as TuiPluginApi
  const run = async (name: string, payload?: unknown) => {
    expect(keymap.dispatchCommand(name, { payload }).ok).toBe(true)
    // Prompt transport is async; allow its clear → append → submit chain to finish.
    await Bun.sleep(0)
  }
  return { api, calls, toasts, queried, route, status, run, draft: () => draft, cleanup: () => destroy() }
}

const commands = [
  { name: "openspec.baseline", prompt: SPEC_BASELINE_PROMPT },
  { name: "openspec.config", prompt: CONFIG_PROMPT },
]

test.each(commands)("$name forwards the string payload from the V1 dispatcher", async ({ name, prompt }) => {
  const f = fixture()
  registerCommands(f.api)
  try {
    await f.run(name, "  ONLY_API_REVIEW_SCOPE\nKeep the second line  ")
    expect(f.draft()).toBe(`${prompt}\n\nArguments: ONLY_API_REVIEW_SCOPE\nKeep the second line`)
    expect(f.calls).toEqual(["clear", "append", "submit"])
  } finally { f.cleanup() }
})

test.each([undefined, "", " \n ", { arguments: "not a string payload" }])("unusable payload %j leaves the template unchanged", async (payload) => {
  const f = fixture()
  registerCommands(f.api)
  try {
    await f.run("openspec.config", payload)
    expect(f.draft()).toBe(CONFIG_PROMPT)
    expect(f.calls).toEqual(["clear", "append", "submit"])
  } finally { f.cleanup() }
})

for (const state of ["busy", "retry"]) {
  test.each(commands)(`$name preserves the draft while ${state}`, async ({ name }) => {
    const f = fixture()
    registerCommands(f.api)
    f.status["session-a"] = state
    try {
      await f.run(name, "scope")
      expect(f.calls).toEqual([])
      expect(f.draft()).toBe("existing user draft")
      expect(f.toasts).toEqual([{ variant: "info", message: "Wait until the agent finishes working" }])
    } finally { f.cleanup() }
  })
}

test("commands read the current route at invocation and remain available on home", async () => {
  const f = fixture()
  registerCommands(f.api)
  try {
    f.status["session-b"] = "busy"
    f.route.current = { name: "session", params: { sessionID: "session-b" } }
    await f.run("openspec.config")
    expect(f.calls).toEqual([])
    expect(f.queried).toEqual(["session-b"])

    f.status["session-b"] = "idle"
    await f.run("openspec.config")
    expect(f.calls).toEqual(["clear", "append", "submit"])

    f.calls.length = 0
    f.queried.length = 0
    f.route.current = { name: "home" }
    await f.run("openspec.baseline")
    expect(f.queried).toEqual([])
    expect(f.calls).toEqual(["clear", "append", "submit"])
    expect(f.draft()).toBe(SPEC_BASELINE_PROMPT)
  } finally { f.cleanup() }
})

test("temporary filesystem commands use the same argument and busy guards", async () => {
  const f = fixture()
  const read = async (path: string) => path.endsWith("/opsx-apply.md") ? "---\ndescription: Apply\n---\nApply this change" : ""
  try {
    expect(await registerOpsxFsCommands(f.api, read)).toBe(1)
    expect(await registerOpsxFsCommands(f.api, read)).toBe(0)
    for (const state of ["busy", "retry"]) {
      f.status["session-a"] = state
      await f.run("openspec.opsx-apply", "my-change")
      expect(f.calls).toEqual([])
      expect(f.draft()).toBe("existing user draft")
    }
    expect(f.toasts).toHaveLength(2)
    f.status["session-a"] = "idle"
    await f.run("openspec.opsx-apply", " my-change ")
    expect(f.draft()).toBe("Apply this change\n\nArguments: my-change")
    expect(f.calls).toEqual(["clear", "append", "submit"])
  } finally { f.cleanup() }
})
