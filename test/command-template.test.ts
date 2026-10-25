import { expect, test } from "bun:test"
import { commandText } from "../src/lib/command-template"
import { sendPrompt, submitPrompt } from "../src/lib/send-prompt"
import { fixture } from "./v2-fixture"

const encode = (text: string) => new TextEncoder().encode(text)
const missing = () => { throw { _tag: "FileNotFoundError" } }

for (const source of ["document", "markdown"] as const) {
  for (const route of ["session", "home"] as const) {
    test.each(["explore", "apply"])(`${source} native overrides cannot change %s execution from ${route}`, async (action) => {
      const f = fixture()
      if (route === "home") f.state.route = { type: "home" }
      const opposite = action === "explore" ? "build" : "plan"
      const native = { template: "Do $ARGUMENTS", agent: opposite, model: "other/forced", subagent: true, subtask: true }
      f.handlers.config = async () => source === "document"
        ? [{ type: "document", info: { commands: { [`opsx-${action}`]: native } } }]
        : [{ type: "directory", path: "/remote/project/.opencode" }]
      f.handlers.read = async () => encode(`---\nagent: ${opposite}\nmodel: other/forced\nsubagent: true\nsubtask: true\n---\n${native.template}`)
      // Model the native override which caused P2: it runs after our session switches.
      let actual = { agent: "old", model: {} as unknown, child: false }
      let delivered: typeof actual | undefined
      f.handlers.switchAgent = async (input: any) => { actual.agent = input.agent }
      f.handlers.switchModel = async (input: any) => { actual.model = input.model }
      f.handlers.create = async (input: any) => { actual = { ...input, child: false }; return { id: "new-session" } }
      f.handlers.command = async () => {
        actual = { agent: native.agent, model: native.model, child: native.subagent }
        delivered = { ...actual }
      }
      f.handlers.prompt = async () => { delivered = { ...actual } }
      expect(await sendPrompt(f.api, `/opsx-${action} example\nkeep scope`)).toBe(true)
      expect(delivered).toMatchObject({
        agent: action === "explore" ? "plan" : "build",
        model: { providerID: "provider", id: "model", variant: "high" }, child: false,
      })
      const prompt = f.calls.find((call) => call.kind === "prompt")
      expect(prompt?.input).toEqual({ sessionID: route === "home" ? "new-session" : "session-a", text: "Do example\nkeep scope" })
      expect(f.calls.some((call) => call.kind === "command")).toBe(false)
      expect(f.calls[0]?.input.description).toContain(`Agent: ${action === "explore" ? "Plan" : "Build"}\nModel: provider/model\nVariant: high`)
    })
  }
}

test.each([
  ["Do $ARGUMENTS", "topic\nkeep $1 and $& literal", "Do topic\nkeep $1 and $& literal"],
  ["First $1; rest $2", '"two words" second third', "First two words; rest second third"],
  ["First $1; third $3", "one two", "First one; third"],
  ["Do the work", "example\nkeep scope", "Do the work\n\nexample\nkeep scope"],
  ["Do the work", "", "Do the work"],
  ["Do $1", "'two words' tail", "Do two words tail"],
])("template %j preserves native argument expansion", async (template, args, expected) => {
  const f = fixture()
  f.handlers.config = async () => [{ type: "document", info: { commands: { "opsx-apply": { template } } } }]
  expect(await commandText(f.api, { directory: "/project" }, "opsx-apply", args)).toBe(expected)
})

test("ordered config sources select the project template and commands/ wins over command/", async () => {
  const f = fixture()
  f.handlers.config = async (input) => {
    expect(input).toEqual({ location: { directory: "/remote/project" } })
    return [
      { type: "document", info: { commands: { "opsx-apply": { template: "global" } } } },
      { type: "directory", path: "/remote/project/.opencode" },
    ]
  }
  f.handlers.read = async (input: any) => {
    expect(input.location).toEqual({ directory: "/remote/project" })
    return encode(input.path === ".opencode/commands/opsx-apply.md" ? "\uFEFF---\r\nagent: plan\r\n---\r\nproject $ARGUMENTS" : "legacy")
  }
  expect(await commandText(f.api, { directory: "/remote/project" }, "opsx-apply", "change")).toBe("project change")
  expect(f.calls.filter((call) => call.kind === "read")).toHaveLength(1)
})

test("later document definition wins over markdown without reading the earlier source", async () => {
  const f = fixture()
  f.handlers.config = async () => [
    { type: "directory", path: "/config/opencode" },
    { type: "document", info: { commands: { "opsx-apply": { template: "last" } } } },
  ]
  expect(await commandText(f.api, f.api.location, "opsx-apply", "")).toBe("last")
  expect(f.calls.some((call) => call.kind === "read")).toBe(false)
})

test.each(["---\n---\nRun $ARGUMENTS", "Run $ARGUMENTS"])("command markdown supports empty or absent frontmatter", async (content) => {
  const f = fixture()
  f.handlers.config = async () => [{ type: "directory", path: "/project/.opencode" }]
  f.handlers.read = async () => encode(content)
  expect(await commandText(f.api, f.api.location, "opsx-apply", "change")).toBe("Run change")
})

test("missing files fall back to the singular command directory in a global server source", async () => {
  const f = fixture()
  f.handlers.config = async () => [
    { type: "directory", path: "/remote/config/opencode" },
    { type: "directory", path: "/remote/project/.opencode" },
  ]
  f.handlers.read = async (input: any) => input.location.directory === "/remote/config/opencode" && input.path === "command/opsx-apply.md"
    ? encode("global $ARGUMENTS") : missing()
  expect(await commandText(f.api, f.api.location, "opsx-apply", "change")).toBe("global change")
  expect(f.calls.filter((call) => call.kind === "read")).toHaveLength(4)
})

test.each(["missing", "unreadable", "empty", "expanded-empty", "shell", "argument-shell"])("%s template stops before session mutation and allows retry", async (kind) => {
  const f = fixture()
  if (kind === "missing") f.handlers.config = async () => []
  else if (kind === "unreadable") {
    f.handlers.config = async () => [{ type: "directory", path: "/remote/.opencode" }]
    f.handlers.read = async () => { throw new Error("read denied") }
  } else f.handlers.config = async () => [{ type: "document", info: { commands: { "opsx-apply": {
    template: kind === "empty" ? " " : kind === "expanded-empty" ? "$ARGUMENTS" : kind === "shell" ? "Run !`pwd`" : "Run $ARGUMENTS",
  } } } }]
  expect(await submitPrompt(f.api, `/opsx-apply${kind === "argument-shell" ? " !`pwd`" : ""}`)).toBe(false)
  expect(f.calls.every((call) => ["config", "read"].includes(call.kind))).toBe(true)
  expect(f.toasts[0]?.variant).toBe("error")
  expect(f.toasts[0]?.message).toMatch(/template|read denied|shell interpolation/)
  expect(await submitPrompt(f.api, "retry as text")).toBe(true)
})

test.each(["route", "location", "busy"])("a %s change during template reads prevents all session mutations", async (kind) => {
  const f = fixture()
  f.handlers.config = async () => [{ type: "directory", path: "/project/.opencode" }]
  f.handlers.read = async () => {
    if (kind === "route") f.state.route = { type: "session", sessionID: "other" }
    if (kind === "location") f.state.directory = "/other"
    if (kind === "busy") f.state.busy = true
    return encode("apply")
  }
  expect(await submitPrompt(f.api, "/opsx-apply change")).toBe(false)
  expect(f.calls.map((call) => call.kind)).toEqual(["config", "read"])
  expect(f.toasts).toHaveLength(1)
})

test("template preparation holds the duplicate guard and captured model", async () => {
  const f = fixture()
  let release!: () => void
  f.handlers.config = async () => {
    await new Promise<void>((resolve) => { release = resolve })
    return [{ type: "document", info: { commands: { "opsx-apply": { template: "apply" } } } }]
  }
  const first = submitPrompt(f.api, "/opsx-apply")
  f.state.model = { providerID: "other", modelID: "during-read" }
  expect(await submitPrompt(f.api, "/opsx-apply")).toBe(false)
  release()
  expect(await first).toBe(true)
  expect(f.calls.filter((call) => call.kind === "prompt")).toHaveLength(1)
  expect(f.calls.find((call) => call.kind === "switchModel")?.input.model).toEqual({ providerID: "provider", id: "model", variant: "high" })
})
