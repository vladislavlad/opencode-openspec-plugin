import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { CONFIG_PROMPT, SPEC_BASELINE_PROMPT } from "../lib/prompts"
import { sendPrompt } from "../lib/send-prompt"

// Register one ephemeral palette command that clears the prompt and submits `prompt`. Wrapped so a
// registration failure can't take the sidebar down with it; returns whether it registered.
function registerPromptCommand(
  api: TuiPluginApi,
  cmd: { name: string; slashName: string; title: string; desc: string; prompt: string },
): boolean {
  try {
    api.keymap.registerLayer({
      commands: [
        {
          namespace: "palette",
          name: cmd.name,
          title: cmd.title,
          desc: cmd.desc,
          category: "OpenSpec",
          slashName: cmd.slashName,
          // Clear first so the `/opsx-…` text typed to filter the palette isn't prepended.
          run: () => void sendPrompt(api, cmd.prompt, { clear: true, submit: true }),
        },
      ],
    })
    return true
  } catch (e) {
    api.ui.toast({ variant: "error", message: `openspec: failed to register /${cmd.slashName} (${String(e)})` })
    return false
  }
}

// Register the ephemeral OpenSpec slash commands. `baselineAvailable` tells the Init flow whether the
// derivation follow-up is reachable.
export function registerCommands(api: TuiPluginApi): { baselineAvailable: boolean } {
  const baselineAvailable = registerPromptCommand(api, {
    name: "openspec.baseline",
    slashName: "opsx-baseline",
    title: "OpenSpec: Baseline specs from code",
    desc: "Configure, then derive/refresh openspec/specs from the existing implementation",
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
