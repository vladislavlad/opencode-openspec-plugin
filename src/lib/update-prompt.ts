// The update turn: bump the plugin and/or the openspec CLI. Everything here needs a shell or an
// edit outside `openspec/`, so it stays with the agent.
import { CLI_PKG, MIN_OPENCODE_VERSION, PLUGIN_PKG } from "./updates"

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
      `2. Confirm OpenCode is >=${MIN_OPENCODE_VERSION} and <3.0.0; stop and explain if it is not. Set the specifier to \`"${PLUGIN_PKG}@${t.plugin.next}"\`.`,
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
      "3. After a successful refresh (including when the tooling was already up to date), run `openspec --version` again and record the actual `X.Y.Z` result as `plugin.tooling-version` in `openspec/config.yaml`. Preserve all existing config fields and comments. If that file is missing, create it with `schema: spec-driven`. If any refresh step or the version check fails, leave the previous recorded version in place and report the failure.",
    )
  }
  if (t.plugin) parts.push("", "## Finally", "If you updated the plugin specifier, tell me to reopen OpenCode to load the new plugin.")
  return parts.join("\n")
}
