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

// Quit via native app.exit so opencode re-scans commands + skills on next launch.
export function quitOpencode(api: TuiPluginApi) {
  try {
    api.keymap.dispatchCommand("app.exit")
  } catch {
    /* ignore */
  }
}

// Run a slash command by submitting it (real agent turn). session.command needs an explicit
// agent/model; tui.executeCommand misses session commands. Clears so half-typed text can't corrupt it.
export async function runCommand(api: TuiPluginApi, command: string) {
  await sendPrompt(api, command, { clear: true, submit: true })
}
