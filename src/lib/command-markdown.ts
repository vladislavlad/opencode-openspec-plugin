import matter from "gray-matter"

// Metadata is data, not executable JavaScript in the TUI process.
const options = { engines: { javascript: () => { throw new Error("Executable frontmatter is unsupported") } } }

// Match OpenCode 2.1.3 config/markdown.ts, including its compatibility retry.
// Passing options prevents gray-matter caching a failed parse as a valid file.
export function commandMarkdown(content: string): string | undefined {
  try {
    let markdown: ReturnType<typeof matter>
    try { markdown = matter(content, options) }
    catch { markdown = matter(sanitize(content), options) }
    return validFields(markdown.data) ? markdown.content.trim() : undefined
  } catch { return undefined }
}

function sanitize(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return content
  const frontmatter = match[1]!
  const result = frontmatter.split(/\r?\n/).flatMap((line) => {
    if (line.trim().startsWith("#") || line.trim() === "" || /^\s+/.test(line)) return [line]
    const entry = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/)
    if (!entry) return [line]
    const value = entry[2]!.trim()
    if (["", ">", "|"].includes(value) || value.startsWith('"') || value.startsWith("'") || !value.includes(":")) return [line]
    return [`${entry[1]}: |-`, `  ${value}`]
  })
  return content.replace(frontmatter, () => result.join("\n"))
}

// ConfigCommand.Info / ConfigModel.Selection fields in the pinned V2 schema.
// Validate membership in the native catalog, but never apply execution metadata.
function validFields(data: Record<string, unknown>): boolean {
  for (const key of ["description", "agent"]) if (data[key] !== undefined && typeof data[key] !== "string") return false
  for (const key of ["subagent", "subtask"]) if (data[key] !== undefined && typeof data[key] !== "boolean") return false
  const model = data.model
  if (model === undefined) return true
  if (typeof model === "string") return /^[^/#]+\/[^#]+(?:#[^#]+)?$/u.test(model)
  if (!model || typeof model !== "object" || Array.isArray(model)) return false
  const ref = model as Record<string, unknown>
  return typeof ref.providerID === "string" && /^[^/#]+$/u.test(ref.providerID)
    && typeof ref.model === "string" && /^[^#]+$/u.test(ref.model)
    && (ref.variant === undefined || typeof ref.variant === "string" && /^[^#]+$/u.test(ref.variant))
}
