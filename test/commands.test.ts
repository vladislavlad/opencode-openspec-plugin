import { expect, test } from "bun:test"
import { registerCommands } from "../src/features/commands"
import { CONFIG_PROMPT } from "../src/lib/config-prompt"
import { SPEC_BASELINE_PROMPT } from "../src/lib/derive-prompt"
import { fixture } from "./v2-fixture"

for (const [id, name, prompt] of [
  ["openspec.baseline", "opsx-baseline", SPEC_BASELINE_PROMPT],
  ["openspec.config", "opsx-config", CONFIG_PROMPT],
]) {
  test(`${name} registers native arguments and submits them to the current session`, async () => {
    const f = fixture()
    expect(registerCommands(f.api).baselineAvailable).toBe(true)
    const command = f.commands.find((c) => c.id === id)!
    expect(command.slash).toEqual({ name, arguments: true })
    expect(command.palette).toBe(true)
    await command.run("  ONLY_API_SCOPE\nsecond line  ")
    expect(f.calls.map((c) => c.kind)).toEqual(["switchAgent", "switchModel", "prompt"])
    expect(f.calls[0]?.input.agent).toBe("build")
    expect(f.calls[1]?.input.model).toEqual({ providerID: "provider", id: "model", variant: "high" })
    expect(f.calls[2]).toEqual({ kind: "prompt", input: { sessionID: "session-a", text: `${prompt}\n\nArguments: ONLY_API_SCOPE\nsecond line` } })
  })
  test(`${name} blocks while the current session is running`, async () => {
    const f = fixture()
    registerCommands(f.api)
    f.state.busy = true
    await f.commands.find((c) => c.id === id)!.run("scope")
    expect(f.calls).toEqual([])
    expect(f.toasts[0]?.variant).toBe("info")
  })
}

test.each([undefined, "", " \n "])("empty arguments %j leave the template unchanged", async (input) => {
  const f = fixture()
  registerCommands(f.api)
  await f.commands.find((c) => c.id === "openspec.config")!.run(input)
  expect(f.calls.find((c) => c.kind === "prompt")?.input.text).toBe(CONFIG_PROMPT)
})

test("native registration failure is visible and disables baseline setup", () => {
  const f = fixture()
  f.api.keymap.layer = () => { throw new Error("invalid layer") }
  expect(registerCommands(f.api).baselineAvailable).toBe(false)
  expect(f.toasts).toHaveLength(2)
})
