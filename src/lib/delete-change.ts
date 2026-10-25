import type { Context } from "@opencode/plugin/tui/context"
import { localRoot, removeLocal } from "./local-fs"
import { ROOT } from "./openspec"
import { sendPrompt } from "./send-prompt"

// Removes a change's folder directly, falling back to the agent when we can't reach the files.
export async function deleteChange(api: Context, name: string, allowAction: () => boolean) {
  if (!allowAction()) return
  const dir = await localRoot(api)
  // Resolving the directory yields to the host; the session may have started a turn meanwhile.
  if (!allowAction()) return
  const removed = dir && (await removeLocal(dir, `${ROOT}/changes/${name}`))
  if (!removed && allowAction()) await sendPrompt(api, `delete openspec change ${name}`)
}
