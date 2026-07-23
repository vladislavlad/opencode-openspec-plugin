import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { CONFIG_PROMPT, SPEC_BASELINE_PROMPT } from "../lib/prompts"
import { sendPrompt } from "../lib/send-prompt"

// Register one ephemeral palette command that submits `prompt`. Returns whether it registered.
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
          // Clear so palette-filter text isn't prepended; forward any text typed after the slash.
          run: (...args: unknown[]) => {
            const typed = typeof args[0] === "string" ? args[0].trim() : ""
            void sendPrompt(api, typed ? `${cmd.prompt}\n\nArguments: ${typed}` : cmd.prompt, { clear: true, submit: true })
          },
        },
      ],
    })
    return true
  } catch (e) {
    api.ui.toast({ variant: "error", message: `openspec: failed to register /${cmd.slashName} (${String(e)})` })
    return false
  }
}

// /opsx-* commands `openspec init` writes; opencode only loads them at startup → need a restart.
const FS_COMMANDS = ["opsx-apply", "opsx-archive", "opsx-explore", "opsx-propose", "opsx-sync", "opsx-update"]

// Drop a leading YAML frontmatter block, leaving the prompt body.
function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n?/)
  return m ? md.slice(m[0].length).trimStart() : md
}

const registeredFsCommands = new Set<string>() // registered this session; re-registering would duplicate

// Bridge the restart gap: register the on-disk /opsx-* files as ephemeral commands. Idempotent.
// Returns how many were newly registered.
export async function registerOpsxFsCommands(api: TuiPluginApi, read: (path: string) => Promise<string>): Promise<number> {
  let count = 0
  for (const name of FS_COMMANDS) {
    if (registeredFsCommands.has(name)) continue
    const body = stripFrontmatter(await read(`.opencode/commands/${name}.md`).catch(() => ""))
    if (!body.trim()) continue
    const ok = registerPromptCommand(api, { name: `openspec.${name}`, slashName: name, title: `OpenSpec: ${name}`, desc: `Run /${name}`, prompt: body })
    if (ok) {
      registeredFsCommands.add(name)
      count++
    }
  }
  return count
}

// Register the plugin's own /opsx-config and /opsx-baseline. `baselineAvailable` gates the Init
// derivation follow-up.
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
