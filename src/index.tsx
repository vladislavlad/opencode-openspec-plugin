import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { registerCommands } from "./features/commands"
import { sendPrompt } from "./lib/send-prompt"
import { OpenSpecSidebar } from "./sidebar"

// Delete a change's folder directly; fall back to asking the agent when fs isn't reachable.
async function deleteChange(api: TuiPluginApi, name: string) {
  const dir = api.state.path.directory
  try {
    if (!dir) throw new Error("no working directory")
    const fs = await import("node:fs/promises")
    // The root is either "openspec" or ".openspec"; force ignores the one that isn't there.
    for (const root of ["openspec", ".openspec"]) {
      await fs.rm(`${dir}/${root}/changes/${name}`, { recursive: true, force: true }).catch(() => {})
    }
  } catch {
    // No filesystem access from the plugin host - hand the deletion to the agent.
    void sendPrompt(api, `delete openspec change ${name}`)
  }
  // The sidebar polls every few seconds, so the removed change drops out on its own.
}

const tui: TuiPlugin = async (api) => {
  const { baselineAvailable } = registerCommands(api)
  api.slots.register({
    order: 600,
    slots: {
      sidebar_content(_ctx, value) {
        return (
          <OpenSpecSidebar
            api={api}
            sessionId={value.session_id}
            onDelete={(name) => void deleteChange(api, name)}
            baselineAvailable={baselineAvailable}
          />
        )
      },
    },
  })
}

export default {
  id: "openspec-tui",
  tui,
} satisfies TuiPluginModule
