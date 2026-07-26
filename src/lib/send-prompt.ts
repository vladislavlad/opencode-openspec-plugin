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

// Submit text as a real agent turn. Clearing first keeps half-typed input from corrupting it.
export const submitPrompt = (api: TuiPluginApi, text: string) => sendPrompt(api, text, { clear: true, submit: true })

// opencode quits on a bare "exit" in the prompt, and rescans commands + skills on the next launch.
export const quitOpencode = (api: TuiPluginApi) => void submitPrompt(api, "exit")
