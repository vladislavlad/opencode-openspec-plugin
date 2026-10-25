import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { ThemeColors } from "../src/lib/theme"
import { ToolingReloadBanner, InitBanner, InitScreen, InitStatus } from "../src/components/init-flow"
import { PostUpdateBanner, UpdateBanner } from "../src/components/update-flow"
import type { MigrationDecision } from "../src/lib/version-history"
import type { Update } from "../src/lib/updates"
import { SettingsView } from "../src/components/settings"

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
  }) as unknown as ThemeColors

async function frame(node: () => any, width = 44, height = 12): Promise<string> {
  const { renderOnce, captureCharFrame, renderer } = await testRender(node, { width, height })
  await renderOnce()
  const text = captureCharFrame()
  renderer.destroy()
  return text
}

const noGate = {}
const update = (current: string, next: string): Update => ({ current, next })

for (const [plugin, cli] of [[false, false], [true, false], [false, true], [true, true]]) {
  test(`settings avoid duplicate single-component updates (plugin=${plugin}, cli=${cli})`, async () => {
    const out = await frame(() => <SettingsView
      theme={theme}
      cliCurrent={() => "1.14.2"}
      pluginUpdate={() => plugin ? update("1.0.0", "2.0.0") : null}
      cliUpdate={() => cli ? update("1.14.2", "1.14.3") : null}
      onCheck={() => {}} onUpdate={() => {}} reloadPending={() => false} onReload={() => {}} gate={noGate}
    />, 46, 22)
    expect(out.includes("Update All")).toBe(plugin && cli)
    expect(out.match(/version available/g) ?? []).toHaveLength(Number(plugin) + Number(cli))
    expect(out).toContain("Check Versions")
    expect(out).not.toContain("Reload OpenCode")
  })
}

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

test("failed native reload offers a retry", async () => {
  const out = await frame(() => <ToolingReloadBanner theme={theme} onReload={() => {}} gate={noGate} />)
  expect(out).toContain("Retry commands")
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
