import type { Context } from "@opencode/plugin/tui/context"
import { CONFIG_PROMPT } from "../lib/config-prompt"
import { SPEC_BASELINE_PROMPT } from "../lib/derive-prompt"
import { submitPrompt } from "../lib/send-prompt"

// Register one native argument-aware command that submits `prompt`. Returns whether it registered.
function registerPromptCommand(
  api: Context,
  cmd: { name: string; slashName: string; title: string; desc: string; prompt: string },
): boolean {
  try {
    api.keymap.layer(() => ({
      mode: "global",
      commands: [{
        id: cmd.name,
        title: cmd.title,
        description: cmd.desc,
        group: "OpenSpec",
        palette: true,
        slash: { name: cmd.slashName, arguments: true },
        run: async (input) => {
          const typed = input?.trim() ?? ""
          await submitPrompt(api, typed ? `${cmd.prompt}\n\nArguments: ${typed}` : cmd.prompt)
        },
      }],
    }))
    return true
  } catch (e) {
    api.ui.toast.show({ variant: "error", message: `openspec: failed to register /${cmd.slashName} (${String(e)})` })
    return false
  }
}

// The plugin's own commands. `baselineAvailable` gates the Init spec-derivation stage.
export function registerCommands(api: Context): { baselineAvailable: boolean } {
  const baselineAvailable = registerPromptCommand(api, {
    name: "openspec.baseline",
    slashName: "opsx-baseline",
    title: "OpenSpec: Baseline specs from code",
    desc: "Derive or refresh openspec/specs from the existing implementation (needs a configured project)",
    prompt: SPEC_BASELINE_PROMPT,
  })
  registerPromptCommand(api, {
    name: "openspec.config",
    slashName: "opsx-config",
    title: "OpenSpec: Configure project context",
    desc: "Set stack, spec language and context in openspec/config.yaml",
    prompt: CONFIG_PROMPT,
  })
  return { baselineAvailable }
}
