import { expect, test } from "bun:test"
import { sendPrompt, submitPrompt, quitOpencode } from "../src/lib/send-prompt"
import { fixture } from "./v2-fixture"

// Fixtures expose no composer mutation API: a successful action cannot clear the user's draft.
test("editable dialog expands command arguments without changing the composer", async () => {
  const f = fixture()
  f.handlers.dialog = async () => "/opsx-apply example\nkeep scope"
  expect(await sendPrompt(f.api, "/opsx-apply ")).toBe(true)
  expect(f.calls.map((c) => c.kind)).toEqual(["dialog", "config", "switchAgent", "switchModel", "prompt"])
  expect(f.calls[0]?.input.description).toContain("Agent: Build\nModel: provider/model\nVariant: high")
  expect(f.calls[2]?.input).toEqual({ sessionID: "session-a", agent: "build" })
  expect(f.calls[3]?.input).toEqual({ sessionID: "session-a", model: { id: "model", providerID: "provider", variant: "high" } })
  expect(f.calls[4]?.input).toEqual({ sessionID: "session-a", text: "Run apply: example\nkeep scope" })
})

test.each([undefined, "", "   "])("cancel or empty dialog %j sends nothing", async (answer) => {
  const f = fixture()
  f.handlers.dialog = async () => answer
  expect(await sendPrompt(f.api, "/opsx-propose ")).toBe(false)
  expect(f.calls.map((c) => c.kind)).toEqual(["dialog"])
})

test.each(["route", "location", "busy"])("a %s change during the dialog prevents submission", async (kind) => {
  const f = fixture()
  f.handlers.dialog = async () => {
    if (kind === "route") f.state.route = { type: "session", sessionID: "session-b" }
    if (kind === "location") f.state.directory = "/other"
    if (kind === "busy") f.state.busy = true
    return "/opsx-propose idea"
  }
  expect(await sendPrompt(f.api, "/opsx-propose ")).toBe(false)
  expect(f.calls.map((c) => c.kind)).toEqual(["dialog"])
  expect(f.toasts).toHaveLength(1)
})

test("a pending submission blocks duplicate actions and releases its lock afterwards", async () => {
  const f = fixture()
  let release!: () => void
  let started!: () => void
  const sending = new Promise<void>((resolve) => { started = resolve })
  f.handlers.prompt = () => new Promise<void>((resolve) => { release = resolve; started() })
  const first = submitPrompt(f.api, "first")
  expect(await submitPrompt(f.api, "second")).toBe(false)
  await sending
  release()
  expect(await first).toBe(true)
  f.handlers.prompt = async () => {}
  expect(await submitPrompt(f.api, "third")).toBe(true)
  expect(f.calls.filter((c) => c.kind === "prompt").map((c) => c.input.text)).toEqual(["first", "third"])
})

test("transport failure is visible and does not keep the action locked", async () => {
  const f = fixture()
  f.handlers.prompt = async () => { throw new Error("offline") }
  expect(await submitPrompt(f.api, "text")).toBe(false)
  expect(f.toasts[0]?.message).toContain("offline")
  f.handlers.prompt = async () => {}
  expect(await submitPrompt(f.api, "retry")).toBe(true)
})

test("home creates one session with the selected model, navigates and submits", async () => {
  const f = fixture()
  f.state.route = { type: "home" }
  expect(await submitPrompt(f.api, "configure")).toBe(true)
  expect(f.calls.map((c) => c.kind)).toEqual(["create", "navigate", "prompt"])
  expect(f.calls[0]?.input).toEqual({ location: { directory: "/project" }, agent: "build", model: { id: "model", providerID: "provider", variant: "high" } })
  expect(f.calls[2]?.input.sessionID).toBe("new-session")
})

test.each(["/opsx-explore", "/opsx-explore investigate\nmore context"])("%s uses Plan with the user's model", async (text) => {
  const f = fixture()
  expect(await sendPrompt(f.api, text)).toBe(true)
  expect(f.calls[0]?.input.description).toContain("Agent: Plan")
  expect(f.calls.find((c) => c.kind === "switchAgent")?.input.agent).toBe("plan")
  expect(f.calls.find((c) => c.kind === "switchModel")?.input.model).toEqual({ id: "model", providerID: "provider", variant: "high" })
  expect(f.calls.at(-1)?.kind).toBe("prompt")
})

test.each(["/opsx-apply change", "/opsx-propose idea", "/opsx-update change", "/opsx-archive change", "/opsx-sync change", "Initialize OpenSpec", "Update the plugin", "Remove the setup marker"])("%s uses Build", async (text) => {
  const f = fixture()
  expect(await submitPrompt(f.api, text)).toBe(true)
  const execution = f.calls.filter((c) => c.kind !== "config")
  expect(execution[0]).toEqual({ kind: "switchAgent", input: { sessionID: "session-a", agent: "build" } })
  expect(execution[1]?.kind).toBe("switchModel")
  expect(execution).toHaveLength(3) // no automatic switch back after submission
})

test("home Explore explicitly creates Plan with the selected model default variant", async () => {
  const f = fixture()
  f.state.route = { type: "home" }
  f.state.model = { providerID: "chosen-provider", modelID: "chosen-model" }
  expect(await sendPrompt(f.api, "/opsx-explore topic")).toBe(true)
  expect(f.calls[0]?.input.description).toContain("Agent: Plan\nModel: chosen-provider/chosen-model\nVariant: default")
  expect(f.calls.find((c) => c.kind === "create")?.input).toEqual({
    location: { directory: "/project" }, agent: "plan",
    model: { providerID: "chosen-provider", id: "chosen-model", variant: undefined },
  })
})

test("editing Explore into Apply shows Build before any session mutation", async () => {
  const f = fixture()
  let dialogs = 0
  f.handlers.dialog = async () => {
    expect(f.calls.every((c) => c.kind === "dialog")).toBe(true)
    dialogs++
    return "/opsx-apply example"
  }
  expect(await sendPrompt(f.api, "/opsx-explore example")).toBe(true)
  expect(dialogs).toBe(2)
  expect(f.calls[0]?.input.description).toContain("Agent: Plan")
  expect(f.calls[1]?.input.description).toContain("Agent: Build")
  expect(f.calls[1]?.input.value).toBe("/opsx-apply example")
  expect(f.calls.find((c) => c.kind === "switchAgent")?.input.agent).toBe("build")
})

test("cancelling a changed-agent preview leaves session settings untouched", async () => {
  const f = fixture()
  let dialogs = 0
  f.handlers.dialog = async () => ++dialogs === 1 ? "/opsx-explore topic" : undefined
  expect(await sendPrompt(f.api, "/opsx-propose idea")).toBe(false)
  expect(f.calls.map((c) => c.kind)).toEqual(["dialog", "dialog"])
})

test("the displayed model snapshot survives dialog and agent-selection changes", async () => {
  const f = fixture()
  f.handlers.dialog = async (input) => {
    f.state.model = { providerID: "other", modelID: "during-dialog" }
    return input.value
  }
  f.handlers.switchAgent = async () => { f.state.model = { providerID: "other", modelID: "agent-default" } }
  expect(await sendPrompt(f.api, "/opsx-apply change")).toBe(true)
  expect(f.calls.find((c) => c.kind === "switchModel")?.input.model).toEqual({ id: "model", providerID: "provider", variant: "high" })
})

test.each(["home", "session"])("no selected model on %s sends nothing", async (route) => {
  const f = fixture()
  if (route === "home") f.state.route = { type: "home" }
  f.state.model = undefined
  expect(await submitPrompt(f.api, "configure")).toBe(false)
  expect(f.calls).toEqual([])
  expect(f.toasts[0]?.message).toContain("Select a model")
})

for (const step of ["switchAgent", "switchModel"] as const) {
  test(`${step} failure prevents dispatch and allows retry`, async () => {
    const f = fixture()
    f.handlers[step] = async () => { throw new Error("selection failed") }
    expect(await submitPrompt(f.api, "configure")).toBe(false)
    expect(f.calls.some((c) => c.kind === "prompt")).toBe(false)
    expect(f.toasts[0]?.message).toContain("selection failed")
    f.handlers[step] = async () => {}
    expect(await submitPrompt(f.api, "configure")).toBe(true)
  })

  test.each(["route", "location", "busy"])(`a %s change during ${step} prevents later steps`, async (change) => {
    const f = fixture()
    f.handlers[step] = async () => {
      if (change === "route") f.state.route = { type: "session", sessionID: "other" }
      if (change === "location") f.state.directory = "/other"
      if (change === "busy") f.state.busy = true
    }
    expect(await submitPrompt(f.api, "/opsx-archive change")).toBe(false)
    expect(f.calls.at(-1)?.kind).toBe(step)
    expect(f.toasts).toHaveLength(1)
  })
}

test("route change while creating a session never redirects or submits", async () => {
  const f = fixture()
  f.state.route = { type: "home" }
  f.handlers.create = async () => { f.state.route = { type: "session", sessionID: "other" }; return { id: "new" } }
  expect(await submitPrompt(f.api, "configure")).toBe(false)
  expect(f.calls.map((c) => c.kind)).toEqual(["create"])
})

test("exit is deferred to the native app command and blocked while running", async () => {
  const f = fixture()
  quitOpencode(f.api)
  expect(f.calls).toEqual([])
  await Bun.sleep(5)
  expect(f.calls).toEqual([{ kind: "dispatch", input: "app.exit" }])
  f.state.busy = true
  quitOpencode(f.api)
  await Bun.sleep(5)
  expect(f.calls).toHaveLength(1)
})
