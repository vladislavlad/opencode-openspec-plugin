import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { EphemeralReloadBanner, InitBanner, InitScreen, InitStatus } from "../src/components/init-flow"
import { PostUpdateBanner, UpdateBanner } from "../src/components/update-flow"
import type { MigrationDecision } from "../src/lib/version-history"
import type { Update } from "../src/lib/updates"

const theme = () =>
  ({
    text: "#ffffff",
    textMuted: "#888888",
    accent: "#00aaff",
    secondary: "#aa88ff",
    success: "#00ff00",
    warning: "#ffaa00",
    error: "#ff0000",
    background: "#000000",
    borderSubtle: "#444444",
  }) as unknown as TuiThemeCurrent

async function frame(node: () => any, width = 44, height = 12): Promise<string> {
  const { renderOnce, captureCharFrame, renderer } = await testRender(node, { width, height })
  await renderOnce()
  const text = captureCharFrame()
  renderer.destroy()
  return text
}

const noGate = {}
const update = (current: string, next: string): Update => ({ current, next })

test("the status line names the running phase", async () => {
  const out = await frame(() => <InitStatus theme={theme} stage={() => "config"} dot={() => 1} />)
  expect(out).toContain("Configuring project")
})

test("the interrupted banner names where setup stopped and offers both buttons", async () => {
  const out = await frame(() => (
    <InitBanner theme={theme} stage={() => "specs"} gate={noGate} onResume={() => {}} onDismiss={() => {}} />
  ))
  expect(out).toContain("while deriving specs")
  expect(out).toContain("Resume")
  expect(out).toContain("Dismiss")
})

test("the Init screen shows the abort warning only after a failed turn", async () => {
  const aborted = await frame(() => <InitScreen theme={theme} aborted={() => true} onInit={() => {}} gate={noGate} />)
  expect(aborted).toContain("Setup aborted")
  expect(aborted).toContain("Init")

  const fresh = await frame(() => <InitScreen theme={theme} aborted={() => false} onInit={() => {}} gate={noGate} />)
  expect(fresh).not.toContain("Setup aborted")
  expect(fresh).toContain("Init")
})

test("the ephemeral bridge asks for a restart", async () => {
  const out = await frame(() => <EphemeralReloadBanner theme={theme} onReload={() => {}} gate={noGate} />)
  expect(out).toContain("Reload")
})

test("the update banner names which components are behind", async () => {
  const out = await frame(() => (
    <UpdateBanner
      theme={theme}
      pluginUpdate={() => update("0.3.0", "0.4.0")}
      cliUpdate={() => null}
      onDismiss={() => {}}
      onSettings={() => {}}
    />
  ))
  expect(out).toContain("plugin")
  expect(out).not.toContain("openspec CLI")
})

test("the post-update banner offers Complete Update only when a migration is pending", async () => {
  const migrate: MigrationDecision = { show: "migrate", range: { old: "0.3.0", new: "0.4.0" }, fromFlag: true }
  const out = await frame(() => <PostUpdateBanner theme={theme} decision={() => migrate} onComplete={() => {}} gate={noGate} />)
  expect(out).toContain("Complete Update")

  // The installed build isn't the loaded one yet – a hint, not a button that would migrate too early.
  const reopen: MigrationDecision = { show: "reopen", range: { old: "0.3.0", new: "0.4.0" } }
  const waiting = await frame(() => <PostUpdateBanner theme={theme} decision={() => reopen} onComplete={() => {}} gate={noGate} />)
  expect(waiting).toContain("Reopen opencode")
  expect(waiting).not.toContain("Complete Update")

  const quiet = await frame(() => (
    <PostUpdateBanner theme={theme} decision={() => ({ show: "none", record: false })} onComplete={() => {}} gate={noGate} />
  ))
  expect(quiet).not.toContain("Complete Update")
  expect(quiet).not.toContain("Reopen opencode")
})
