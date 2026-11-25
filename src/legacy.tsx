import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { registerCommands } from "./features/commands"
import { OpenSpecSidebar } from "./sidebar"

export const tui: TuiPlugin = async (api) => {
  const { baselineAvailable } = registerCommands(api)
  api.slots.register({
    order: 600,
    slots: {
      sidebar_content(_ctx, value) {
        return <OpenSpecSidebar api={api} sessionId={value.session_id} baselineAvailable={baselineAvailable} />
      },
    },
  })
}
