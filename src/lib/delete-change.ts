import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { localRoot, removeLocal } from "./local-fs"
import { ROOT } from "./openspec"
import { sendPrompt } from "./send-prompt"

// Removes a change's folder directly, falling back to the agent when we can't reach the files.
export async function deleteChange(api: TuiPluginApi, name: string) {
  const dir = await localRoot(api)
  const removed = dir && (await removeLocal(dir, `${ROOT}/changes/${name}`))
  if (!removed) void sendPrompt(api, `delete openspec change ${name}`)
}
