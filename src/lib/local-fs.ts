import { projectLocation } from "./location"
// Plugin-managed writes stay local and guarded. Against a remote server, the reported
// location may be inaccessible to this TUI; hand the edit to the agent in that case.
//
// Every helper here therefore returns null/false instead of throwing, so callers can fall back to
// handing the job to the agent, who always runs where the files are.
import type { Context } from "@opencode/plugin/tui/context"

// The project directory, but only when this process can actually see it.
export async function localRoot(api: Context): Promise<string | null> {
  const dir = projectLocation(api).directory
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
