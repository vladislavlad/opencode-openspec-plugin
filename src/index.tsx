import { Plugin } from "@opencode/plugin/tui"
import { Show } from "solid-js"
import { registerCommands } from "./features/commands"
import { projectLocation } from "./lib/location"
import { OpenSpecSidebar } from "./sidebar"

export default Plugin.define({
  id: "openspec-tui",
  setup(api) {
    const { baselineAvailable } = registerCommands(api)
    return api.ui.slot({
      append: "sidebar.content",
      render: (slot) => (
        <Show when={JSON.stringify([slot.sessionID, projectLocation(api, slot.sessionID)])} keyed>
          {(_key) => <OpenSpecSidebar api={api} sessionId={slot.sessionID} baselineAvailable={baselineAvailable} />}
        </Show>
      ),
    })
  },
})
