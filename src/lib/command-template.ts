import type { Context } from "@opencode/plugin/tui/context"
import { posix, win32 } from "node:path"
import { commandMarkdown } from "./command-markdown"

// V2's command executor applies agent/model/subagent metadata after session selection.
// Resolve text only: plugin actions must keep the agent/model shown in their dialog.
// Source order and argument expansion match OpenCode 2.1.3 config/plugin/command.ts.
export async function commandText(api: Context, location: Context["location"], name: string, args: string): Promise<string> {
  if (!/^opsx-[\w-]+$/.test(name)) throw new Error("Invalid OpenSpec command name")
  const entries = await api.client.config.get({ location })
  for (const entry of entries.toReversed()) {
    if (entry.type === "document") {
      const command = entry.info.commands?.[name]
      if (command) return expand(command.template, args, name)
      continue
    }
    // The host loads sorted paths, so commands/ wins over command/ within one source.
    for (const directory of ["commands", "command"]) {
      let content: string
      try {
        const bytes = await api.client.file.read(commandRead(location, entry.path, `${directory}/${name}.md`))
        content = new TextDecoder().decode(bytes)
      } catch (error) {
        if (error && typeof error === "object" && "_tag" in error && error._tag === "FileNotFoundError") continue
        throw error
      }
      const template = commandMarkdown(content)
      if (template !== undefined) return expand(template, args, name)
    }
  }
  throw new Error(`No readable template for /${name}. Refresh OpenSpec tooling with openspec update, then retry.`)
}

function commandRead(location: Context["location"], source: string, file: string) {
  // The paths belong to the server, whose OS can differ from the TUI's.
  const paths = /^(?:[a-z]:[\\/]|\\\\)/i.test(source) ? win32 : posix
  if (location?.directory) {
    const relative = paths.relative(location.directory, source)
    if (!paths.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${paths.sep}`)) {
      // Keeping the project scope permits links from .opencode to project/templates.
      return { location, path: paths.join(relative, file) }
    }
  }
  return { location: { directory: source }, path: file }
}

function expand(template: string, input: string, name: string): string {
  if (!template.trim()) throw new Error(`The /${name} template is empty. Restore it with openspec update, then retry.`)
  const args = (input.match(/(?:\[Image\s+\d+\]|"[^"]*"|'[^']*'|[^\s"']+)/gi) ?? []).map((arg) => arg.replace(/^["']|["']$/g, ""))
  const placeholders = template.match(/\$(\d+)/g) ?? []
  const last = Math.max(0, ...placeholders.map((item) => Number(item.slice(1))))
  const expanded = template.replace(/\$(\d+)/g, (_, index) => {
    const position = Number(index)
    if (position > args.length) return ""
    return position === last ? args.slice(position - 1).join(" ") : args[position - 1] ?? ""
  }).replaceAll("$ARGUMENTS", () => input)
  const text = (placeholders.length === 0 && !template.includes("$ARGUMENTS") && input.trim() ? `${expanded}\n\n${input}` : expanded).trim()
  // The plugin never shells out. Do not silently execute native metadata as a fallback.
  if (/!`[^`]+`/.test(text)) throw new Error(`/${name} contains shell interpolation. Replace it with instructions for the agent before running this action.`)
  if (!text) throw new Error(`The /${name} template expands to empty text. Supply arguments or fix the template.`)
  return text
}
