// The update turn: bump the plugin and/or the openspec CLI. Everything here needs a shell or an
// edit outside `openspec/`, so it stays with the agent.
import { CLI_PKG, PLUGIN_PKG } from "./updates"

// What an update turn should touch. Plugin carries `current` so the agent can stamp the migration
// flag; CLI only needs the target. Fields are independent – Update All passes both.
export interface UpdateTargets {
  plugin?: { current: string; next: string }
  cli?: { next: string }
}

// The plugin is bumped by editing its `cli.json` specifier (opencode reinstalls on restart), the CLI
// by a global install + `openspec update`. Only the plugin block writes the migration flag.
export function buildUpdatePrompt(t: UpdateTargets): string {
  const parts = ["Update the OpenSpec tooling as described below. Do ONLY the steps listed – do not touch anything else."]
  if (t.plugin) {
    parts.push(
      "",
      "## Update the plugin",
      `1. Find the global OpenCode V2 \`cli.json\`: use \`OPENCODE_CONFIG_DIR/cli.json\` when overridden, otherwise \`$XDG_CONFIG_HOME/opencode/cli.json\` or \`~/.config/opencode/cli.json\`. There is no project-local CLI config. Check \`OPENCODE_CLI_CONFIG_CONTENT\` too: if its plugins override owns this entry, explain that override and stop instead of editing an ineffective file. The \`"plugins"\` array contains "${PLUGIN_PKG}" (optionally with a \`@version\` suffix). Entries are strings or objects with \`package\` and \`options\`; edit only the package specifier and preserve options, comments and other entries. Do not edit V1 \`tui.json\` or the server \`opencode.json\`.`,
      `   - If that entry is a local filesystem path or file URL, this is a dev checkout: SKIP the plugin update and tell me so. V2 loads local CLI plugins by package directory, using a physical tui entrypoint.`,
      `2. Confirm OpenCode is >=2.1.3 and <3.0.0; stop and explain if it is not. Set the specifier to \`"${PLUGIN_PKG}@${t.plugin.next}"\`.`,
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
