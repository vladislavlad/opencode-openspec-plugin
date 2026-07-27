// Version checks: what's installed vs. what npm has. Config-file state lives in `config.ts`.
import type { FileClient } from "./openspec"
import { VERSION } from "./version"

// Scoped names are URL-encoded (`/` → `%2F`) when hitting the registry.
export const PLUGIN_PKG = "@vladislavlad/opencode-openspec-plugin"
export const CLI_PKG = "@fission-ai/openspec"

// A pending update: the version on disk vs. the newer one on npm.
export interface Update {
  current: string
  next: string
}

export interface VersionState {
  pluginCurrent: string
  cliCurrent: string | null // null when the `generatedBy` stamp can't be found
  reachable: boolean // at least one registry call returned – tells "up to date" from "couldn't check"
  plugin: Update | null
  cli: Update | null
}

// Strictly higher semver, comparing major.minor.patch only – enough to decide "an update exists".
export function semverGt(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0)
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

// Aborts after 3s; any failure yields null so a slow or offline registry never blocks the sidebar.
export async function fetchLatest(pkg: string): Promise<string | null> {
  const url = `https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// The CLI version that generated the on-disk instruction files, from `generatedBy` in any SKILL.md.
export async function readCliVersion(client: FileClient): Promise<string | null> {
  let dirs: string[]
  try {
    dirs = (await client.list(".opencode/skills")).filter((e) => e.type === "directory").map((e) => e.name)
  } catch {
    return null
  }
  for (const dir of dirs) {
    const md = await client.read(`.opencode/skills/${dir}/SKILL.md`).catch(() => "")
    const m = /generatedBy:\s*"?([0-9]+\.[0-9]+\.[0-9]+)"?/.exec(md)
    if (m) return m[1]
  }
  return null
}

// Current versions vs. npm `latest` for both. Registry calls run in parallel; failures degrade to null.
export async function checkVersions(client: FileClient): Promise<VersionState> {
  const [pluginLatest, cliCurrent, cliLatest] = await Promise.all([
    fetchLatest(PLUGIN_PKG),
    readCliVersion(client),
    fetchLatest(CLI_PKG),
  ])
  return {
    pluginCurrent: VERSION,
    cliCurrent,
    reachable: pluginLatest !== null || cliLatest !== null,
    plugin: pluginLatest && semverGt(pluginLatest, VERSION) ? { current: VERSION, next: pluginLatest } : null,
    cli: cliCurrent && cliLatest && semverGt(cliLatest, cliCurrent) ? { current: cliCurrent, next: cliLatest } : null,
  }
}
