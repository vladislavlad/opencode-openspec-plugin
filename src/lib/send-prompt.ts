import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

// Push text into the TUI prompt. `clear` wipes the input first; `submit` sends it.
export async function sendPrompt(api: TuiPluginApi, text: string, opts: { clear?: boolean; submit?: boolean } = {}) {
  const dir = api.state.path.directory
  try {
    if (opts.clear) await api.client.tui.clearPrompt({ directory: dir })
    await api.client.tui.appendPrompt({ text, directory: dir })
    if (opts.submit) await api.client.tui.submitPrompt({ directory: dir })
  } catch {
    /* ignore if the TUI rejects the prompt */
  }
}
