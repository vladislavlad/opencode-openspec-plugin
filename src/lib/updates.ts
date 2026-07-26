import { parse as parseYaml } from "yaml"
import type { FileClient } from "./openspec"
import { INIT_STAGES, type InitStage } from "./prompts"
import { VERSION } from "./version"

// npm package names. Scoped names are URL-encoded (`/` → `%2F`) when hitting the registry.
export const PLUGIN_PKG = "@vladislavlad/opencode-openspec-plugin"
export const CLI_PKG = "@fission-ai/openspec"

// A pending update: the version on disk vs. the newer one on npm.
export interface Update {
  current: string
  next: string
}

// The whole version picture the sidebar renders. `pluginCurrent` is always the build constant;
// `cliCurrent` is null when the `generatedBy` stamp can't be found. `reachable` is true when at
// least one registry call returned — lets the caller tell "up to date" apart from "couldn't check".
export interface VersionState {
  pluginCurrent: string
  cliCurrent: string | null
  reachable: boolean
  plugin: Update | null
  cli: Update | null
}

// True when `a` is a strictly higher semver than `b`, comparing major.minor.patch only
// (prerelease/build suffixes are ignored — enough to decide "an update exists").
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

// GET registry.npmjs.org/<pkg>/latest → its `.version`. Aborts after 3s; any failure yields null so
// a slow/offline registry never blocks or breaks the sidebar.
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

// The openspec CLI version that generated the on-disk instruction files — read from `generatedBy`
// in any `.opencode/skills/*/SKILL.md`. Null when no skill/stamp is found ("unknown" in the UI).
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

// Read current versions (plugin = build constant, CLI = generatedBy) and the npm `latest` for both,
// then decide whether each has an update. Registry calls run in parallel; failures degrade to null.
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

// The post-update flag the agent writes after bumping the plugin: which version we're migrating from/to.
export interface UpdateFlag {
  old: string
  new: string
}

interface PluginConfig {
  plugin?: {
    "update-in-progress"?: { old?: unknown; new?: unknown }
    init?: { "in-progress"?: unknown; done?: unknown }
  }
}

// Parsed config.yaml from the first root that has one. Null when missing or malformed.
async function readConfig(client: FileClient): Promise<PluginConfig | null> {
  for (const root of ["openspec", ".openspec"]) {
    const content = await client.read(`${root}/config.yaml`).catch(() => "")
    if (!content) continue
    try {
      return (parseYaml(content) as PluginConfig) ?? null
    } catch {
      return null // malformed yaml — treat as no config
    }
  }
  return null
}

// Read `plugin.update-in-progress` from config.yaml. Null when there's no config or no flag.
// Read cheaply on every poll so the banner clears once the agent removes it.
export async function readUpdateFlag(client: FileClient): Promise<UpdateFlag | null> {
  const f = (await readConfig(client))?.plugin?.["update-in-progress"]
  if (f && (f.old != null || f.new != null)) return { old: String(f.old ?? ""), new: String(f.new ?? "") }
  return null
}

// The setup marker the agent maintains: `in-progress` while setup runs, `done` listing the stages it
// has finished. Drives the status line, the interrupted-setup banner and what Resume skips.
export interface InitState {
  inProgress: boolean
  done: InitStage[]
}

export async function readInitFlag(client: FileClient): Promise<InitState> {
  const init = (await readConfig(client))?.plugin?.init
  const flag = init?.["in-progress"]
  const done = Array.isArray(init?.done) ? init.done.filter((s): s is InitStage => INIT_STAGES.includes(s)) : []
  return { inProgress: flag === true || flag === "true", done }
}
