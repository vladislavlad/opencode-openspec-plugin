import type { TuiPluginModule } from "@opencode-ai/plugin/tui"

type MigrationNotice = {
  ui: { dialog: { alert(input: { title: string; message: string }): Promise<unknown> } }
}

const notice = {
  title: "OpenSpec plugin update required",
  message: [
    "OpenCode 2 requires OpenSpec plugin 2.0.0 or a later 2.x release.",
    "The new plugin requires OpenCode 2.4.1 or newer.",
    "Replace the OpenSpec package in cli.json’s plugins array with:",
    "@vladislavlad/opencode-openspec-plugin@opencode-v2",
    "Keep any existing options and reopen OpenCode.",
  ].join("\n\n"),
}

export default {
  id: "openspec-tui",
  // Only OpenCode 1 imports the legacy renderer or registers OpenSpec actions.
  async tui(...args: Parameters<TuiPluginModule["tui"]>) {
    const { tui } = await import("./legacy")
    return tui(...args)
  },
  setup(api: MigrationNotice) {
    void api.ui.dialog.alert(notice)
  },
} satisfies TuiPluginModule & { setup(api: MigrationNotice): void }
