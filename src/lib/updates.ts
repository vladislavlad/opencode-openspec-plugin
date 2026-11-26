// Version checks: what's installed vs. what npm has. Config-file state lives in `config.ts`.
import type { FileClient } from "./openspec"
import { VERSION } from "./version"
import { LEGACY_SKILL_DIR, MODERN_SKILL_DIR, OPENSPEC_SKILLS } from "./openspec-tooling"

// Scoped names are URL-encoded (`/` → `%2F`) when hitting the registry.
export const PLUGIN_PKG = "@vladislavlad/opencode-v2-openspec-plugin"
export const CLI_PKG = "@fission-ai/openspec"
export const MIN_CLI_VERSION = "2.2.0"
export const MIN_OPENCODE_VERSION = "2.4.1"

// A pending update: the version on disk vs. the newer one on npm.
export interface Update {
  current: string
  next: string
}

export interface VersionState {
  pluginLatest: string | null
  legacyToolingVersion: string | null
  cliLatest: string | null
  plugin: Update | null
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
    return /^\d+\.\d+\.\d+$/.test(data.version ?? "") ? data.version! : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Legacy fallback for projects the agent hasn't verified yet. Modern skills omit this stamp.
export async function readCliVersion(client: FileClient): Promise<string | null> {
  for (const path of [MODERN_SKILL_DIR, LEGACY_SKILL_DIR]) {
    const entries = await client.list(path).catch(() => [])
    const skills = entries.filter(({ name, type }) => type === "directory" && (hasKnownSkill(name) || name === "openspec"))
    for (const { name } of skills) {
      const md = await client.read(`${path}/${name}/SKILL.md`).catch(() => "")
      const version = /^\s*generatedBy:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/m.exec(md)
      if (version) return version[1]
    }
    if (skills.length > 0) return null
  }
  return null
}

const hasKnownSkill = (name: string) => OPENSPEC_SKILLS.some((skill) => skill === name)

export async function checkVersions(client: FileClient): Promise<VersionState> {
  const [pluginLatest, legacyToolingVersion, cliLatest] = await Promise.all([
    fetchLatest(PLUGIN_PKG),
    readCliVersion(client),
    fetchLatest(CLI_PKG),
  ])
  return {
    pluginLatest,
    legacyToolingVersion,
    cliLatest,
    plugin: pluginLatest?.startsWith("2.") && semverGt(pluginLatest, VERSION) ? { current: VERSION, next: pluginLatest } : null,
  }
}
