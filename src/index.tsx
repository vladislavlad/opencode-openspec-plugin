import { Plugin } from "@opencode/plugin/tui"
import { Show } from "solid-js"
import { registerCommands } from "./features/commands"
import { projectLocation } from "./lib/location"
import { OpenSpecSidebar } from "./sidebar"
import { MIN_OPENCODE_VERSION, semverGt } from "./lib/updates"

export default Plugin.define({
  id: "openspec-tui",
  setup(api) {
    if (!api.app.version.startsWith("2.") || semverGt(MIN_OPENCODE_VERSION, api.app.version)) {
      void api.ui.dialog.alert({
        title: "OpenCode update required",
        message: `The OpenSpec plugin requires OpenCode ${MIN_OPENCODE_VERSION} or newer within OpenCode 2. Update OpenCode and reopen it to enable the sidebar and commands.`,
      })
      return
    }
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
