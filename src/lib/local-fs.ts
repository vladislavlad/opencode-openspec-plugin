// opencode's plugin API can only READ files (`file.list` / `file.read`) — there is no write
// endpoint. So writes go through `node:fs`, which works only while the TUI and the project share a
// filesystem. That's the normal case, but not guaranteed: `state.path.directory` is just a string
// the server reports, and against a remote server it names a path this process can't see.
//
// Every helper here therefore returns null/false instead of throwing, so callers can fall back to
// handing the job to the agent, who always runs where the files are.
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

// The project directory, but only when this process can actually see it.
export async function localRoot(api: TuiPluginApi): Promise<string | null> {
  const dir = api.state.path.directory
  if (!dir) return null
  try {
    const { stat } = await import("node:fs/promises")
    return (await stat(dir)).isDirectory() ? dir : null
  } catch {
    return null
  }
}

// File content, or null when it's missing or unreachable.
export async function readLocal(dir: string, path: string): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises")
    return await readFile(`${dir}/${path}`, "utf8")
  } catch {
    return null
  }
}

// Writes `path`, creating parent directories. False when the write didn't happen.
export async function writeLocal(dir: string, path: string, content: string): Promise<boolean> {
  try {
    const { mkdir, writeFile } = await import("node:fs/promises")
    const full = `${dir}/${path}`
    await mkdir(full.slice(0, full.lastIndexOf("/")), { recursive: true })
    await writeFile(full, content, "utf8")
    return true
  } catch {
    return false
  }
}

// Recursive delete. False when it didn't happen; a missing path counts as success.
export async function removeLocal(dir: string, path: string): Promise<boolean> {
  try {
    const { rm } = await import("node:fs/promises")
    await rm(`${dir}/${path}`, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
