// The update turn: bump the plugin and/or the openspec CLI. Everything here needs a shell or an
// edit outside `openspec/`, so it stays with the agent.
import { CLI_PKG, PLUGIN_PKG } from "./updates"

// What an update turn should touch. Plugin carries `current` so the agent can stamp the migration
// flag; CLI only needs the target. Fields are independent – Update All passes both.
export interface UpdateTargets {
  plugin?: { current: string; next: string }
  cli?: { next: string }
}

// The plugin is bumped by editing its `tui.json` specifier (opencode reinstalls on restart), the CLI
// by a global install + `openspec update`. Only the plugin block writes the migration flag.
export function buildUpdatePrompt(t: UpdateTargets): string {
  const parts = ["Update the OpenSpec tooling as described below. Do ONLY the steps listed – do not touch anything else."]
  if (t.plugin) {
    parts.push(
      "",
      "## Update the plugin",
      `1. Find the \`tui.json\` that registers this plugin – check the project \`tui.json(c)\` and the global OpenCode config directory (\`OPENCODE_CONFIG_DIR\`, \`$XDG_CONFIG_HOME/opencode\`, or \`~/.config/opencode\`). Its \`"plugin"\` array contains \`"${PLUGIN_PKG}"\` (optionally with a \`@version\` suffix). The entry may be a plain string or a \`["${PLUGIN_PKG}", { …options }]\` tuple – edit the string part.`,
      `   - If that entry is a local filesystem path (e.g. it ends in \`dist/index.js\`), this is a dev checkout: SKIP the plugin update and tell me so.`,
      `2. Set the specifier to \`"${PLUGIN_PKG}@${t.plugin.next}"\`.`,
      "3. In `openspec/config.yaml`, add this block (keep `schema`, `context`, `rules` intact; create the file with `schema: spec-driven` if it doesn't exist yet):",
      "```yaml",
      "plugin:",
      "  update-in-progress:",
      `    old: ${t.plugin.current}`,
      `    new: ${t.plugin.next}`,
      "```",
    )
  }
  if (t.cli) {
    parts.push(
      "",
      "## Update the openspec CLI",
      `1. Run \`openspec --version\`. If it is already ${t.cli.next} or newer, keep the installed version and continue to step 2. Otherwise detect how the existing binary was installed and upgrade it using the same method. For npm use Node.js 22.20.0 or newer.`,
      "   For a standalone OpenSpec binary, use its official installer. For a package-managed binary, use the matching installer:",
      `   npm: \`npm i -g ${CLI_PKG}@${t.cli.next}\` · pnpm/bun: \`add -g\` · yarn: \`global add\`.`,
      "2. Run `openspec update --dry-run` and inspect the planned changes. Preserve any customized commands and skills. Run `openspec update` to refresh the project tooling. If workflow skills are missing after the update, run `openspec init --tools opencode --profile core --scope project`.",
    )
  }
  parts.push("", "## Finally", "Tell me to reopen opencode to apply the update.")
  return parts.join("\n")
}
