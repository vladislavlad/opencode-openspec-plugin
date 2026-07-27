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
      `1. Find the \`tui.json\` that registers this plugin – check \`<project>/.opencode/tui.json\` first, then \`~/.config/opencode/tui.json\`. Its \`"plugin"\` array contains \`"${PLUGIN_PKG}"\` (optionally with a \`@version\` suffix). The entry may be a plain string or a \`["${PLUGIN_PKG}", { …options }]\` tuple – edit the string part.`,
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
      "1. Detect which package manager owns the global `openspec` binary (`npm -v`, `pnpm -v`, `yarn -v`, `bun --version`) and install the new version globally:",
      `   npm: \`npm i -g ${CLI_PKG}@${t.cli.next}\` · pnpm/bun: \`add -g\` · yarn: \`global add\`.`,
      "2. Run `openspec update --force` to regenerate the `.opencode` commands and skills.",
    )
  }
  parts.push("", "## Finally", "Tell me to reopen opencode to apply the update.")
  return parts.join("\n")
}
