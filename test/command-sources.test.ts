import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { join, relative, isAbsolute } from "node:path"
import { tmpdir } from "node:os"
import matter from "gray-matter"
import { Schema, Option } from "effect"
import { ConfigCommand } from "@opencode/schema/config/command"
import { commandMarkdown } from "../src/lib/command-markdown"
import { commandText } from "../src/lib/command-template"
import { sendPrompt, submitPrompt } from "../src/lib/send-prompt"
import { fixture } from "./v2-fixture"

const encode = (text: string) => new TextEncoder().encode(text)
const missing = () => { throw { _tag: "FileNotFoundError" } }

for (const link of ["file", "directory"]) {
  test.each(["explore", "apply"])(`project ${link} symlink preserves %s template and execution settings over global fallback`, async (action) => {
    const root = await mkdtemp(join(tmpdir(), "opsx-command-link-"))
    try {
      const project = join(root, "project")
      const config = join(project, ".opencode")
      const global = join(root, "global")
      const templates = join(project, "templates")
      await Promise.all([mkdir(config, { recursive: true }), mkdir(templates, { recursive: true }), mkdir(join(global, "commands"), { recursive: true })])
      const filename = `opsx-${action}.md`
      await writeFile(join(global, "commands", filename), "GLOBAL $ARGUMENTS")
      await writeFile(join(templates, filename), `---\nagent: ${action === "explore" ? "build" : "plan"}\nmodel: wrong/forced\nsubagent: true\n---\nPROJECT $ARGUMENTS`)
      if (link === "directory") await symlink("../templates", join(config, "commands"))
      else {
        await mkdir(join(config, "commands"))
        await symlink(`../../templates/${filename}`, join(config, "commands", filename))
      }
      const f = fixture()
      f.state.directory = project
      f.handlers.config = async () => [{ type: "directory", path: global }, { type: "directory", path: config }]
      // Match the actual V2 read API's realpath confinement (not an unrestricted fs mock).
      f.handlers.read = async (input: any) => {
        const directory = await realpath(input.location.directory)
        const target = await realpath(join(directory, input.path)).catch(() => undefined)
        if (!target) return missing()
        const rel = relative(directory, target)
        if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) return missing()
        return readFile(target)
      }
      expect(await sendPrompt(f.api, `/opsx-${action} example`)).toBe(true)
      expect(f.calls.find((call) => call.kind === "prompt")?.input.text).toBe("PROJECT example")
      expect(f.calls.find((call) => call.kind === "switchAgent")?.input.agent).toBe(action === "explore" ? "plan" : "build")
      expect(f.calls.find((call) => call.kind === "switchModel")?.input.model).toEqual({ id: "model", providerID: "provider", variant: "high" })
      expect(f.calls.some((call) => call.kind === "command")).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
}

test.each([
  ["C:\\project", "C:\\project\\.opencode", "C:\\project", ".opencode\\commands\\opsx-apply.md"],
  ["/project", "/project-extra/.opencode", "/project-extra/.opencode", "commands/opsx-apply.md"],
  ["/project/", "/project/.opencode", "/project/", ".opencode/commands/opsx-apply.md"],
  ["/project", "/global/opencode", "/global/opencode", "commands/opsx-apply.md"],
])("read scope for %s and %s follows server paths", async (project, source, directory, path) => {
  const f = fixture()
  f.handlers.config = async () => [{ type: "directory", path: source }]
  f.handlers.read = async (input) => {
    expect(input).toEqual({ location: { directory }, path })
    return encode("body")
  }
  expect(await commandText(f.api, { directory: project }, "opsx-apply", "")).toBe("body")
})

const invalid = [
  'description: "unterminated', "description: [unfinished", "description: 123", "description: null",
  "agent: [plan]", "subagent: yes", "subtask: 1", "model: null", "model: no-provider",
  "model:\n  providerID: p\n  model: m\n  variant: null", "model:\n  providerID: p/q\n  model: m",
]

test.each(invalid)("invalid frontmatter %j selects the valid global definition without executing its body", async (header) => {
  const f = fixture()
  f.handlers.config = async () => [
    { type: "document", info: { commands: { "opsx-apply": { template: "GLOBAL $ARGUMENTS", agent: "plan", model: "wrong/forced", subagent: true } } } },
    { type: "directory", path: "/project/.opencode" },
  ]
  f.handlers.read = async (input: any) => input.path.endsWith("commands/opsx-apply.md") ? encode(`---\n${header}\n---\nINVALID body`) : missing()
  expect(await submitPrompt(f.api, "/opsx-apply example")).toBe(true)
  expect(f.calls.find((call) => call.kind === "prompt")?.input.text).toBe("GLOBAL example")
  expect(f.calls.find((call) => call.kind === "switchAgent")?.input.agent).toBe("build")
  expect(f.calls.find((call) => call.kind === "switchModel")?.input.model).toEqual({ id: "model", providerID: "provider", variant: "high" })
  expect(f.calls.some((call) => call.kind === "command")).toBe(false)
})

test("invalid commands/ falls back to valid command/ before global configuration", async () => {
  const f = fixture()
  f.handlers.config = async () => [
    { type: "document", info: { commands: { "opsx-apply": { template: "global" } } } },
    { type: "directory", path: "/project/.opencode" },
  ]
  f.handlers.read = async (input: any) => encode(input.path.includes("commands/") ? '---\ndescription: "unterminated\n---\ninvalid' : "local singular")
  expect(await commandText(f.api, f.api.location, "opsx-apply", "")).toBe("local singular")
})

test.each(["home", "session"])("only invalid definitions from %s send nothing and leave settings untouched", async (route) => {
  const f = fixture()
  if (route === "home") f.state.route = { type: "home" }
  f.handlers.config = async () => [{ type: "directory", path: "/project/.opencode" }]
  f.handlers.read = async () => encode('---\ndescription: "unterminated\n---\nNEVER SEND')
  expect(await submitPrompt(f.api, "/opsx-apply")).toBe(false)
  expect(f.calls.every((call) => call.kind === "config" || call.kind === "read")).toBe(true)
  expect(f.toasts[0]?.message).toContain("No readable template")
  expect(await submitPrompt(f.api, "retry")).toBe(true)
})

test.each([
  "", "null", "[one, two]", 'description: "quoted: text"', "description: |\n  multiline\n  text",
  "agent: plan\nmodel: provider/model#high\nsubagent: true\nsubtask: false",
  "model:\n  providerID: provider\n  model: model\n  variant: high", "description: 2026-01-01",
  ...invalid.slice(2),
])("frontmatter field validity matches the pinned native schema: %j", (header) => {
  const text = `---\n${header}\n---\nBODY`
  const parsed = matter(text, {})
  const native = Schema.decodeUnknownOption(ConfigCommand.Info)({ ...parsed.data, template: parsed.content.trim() })
  expect(commandMarkdown(text) !== undefined).toBe(Option.isSome(native))
})

test("native colon repair preserves a valid body across repeated failed first parses", () => {
  const content = "---\ndescription: Review: inspect changes\nagent: plan\n---\nBODY $ARGUMENTS"
  expect(commandMarkdown(content)).toBe("BODY $ARGUMENTS")
  expect(commandMarkdown(content)).toBe("BODY $ARGUMENTS")
  const malformed = '---\ndescription: "unterminated\n---\nNEVER SEND'
  expect(commandMarkdown(malformed)).toBeUndefined()
  expect(commandMarkdown(malformed)).toBeUndefined()
})

test.each(["js", "javascript", "JS"])("%s frontmatter never executes inside the TUI", (language) => {
  const key = "openspecFrontmatterExecuted"
  try {
    expect(commandMarkdown(`---${language}\n(globalThis.${key} = true, {})\n---\nbody`)).toBeUndefined()
    expect(Reflect.has(globalThis, key)).toBe(false)
  } finally { Reflect.deleteProperty(globalThis, key) }
})
