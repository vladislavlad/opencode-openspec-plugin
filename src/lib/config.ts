// The plugin's own `plugin:` block inside openspec/config.yaml — the setup marker and the
// post-update flag. Stage checkpoints and the post-update flag are written by the agent; the plugin
// only stamps `in-progress` up front (see `writeInitMarker`).
import { isMap, parseDocument, parse as parseYaml } from "yaml"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { localRoot, readLocal, writeLocal } from "./local-fs"
import { ROOT, type FileClient } from "./openspec"

// The only place the CLI keeps it.
export const CONFIG_PATH = `${ROOT}/config.yaml`

// Setup stages in order. The agent checkpoints each one, so an interrupted run can resume from the
// first stage that's missing.
export const INIT_STAGES = ["tooling", "config", "specs"] as const
export type InitStage = (typeof INIT_STAGES)[number]

// Left by an update turn: which versions the plugin is migrating between.
export interface UpdateFlag {
  old: string
  new: string
}

export interface InitState {
  inProgress: boolean
  done: InitStage[]
}

export interface PluginState {
  update: UpdateFlag | null
  init: InitState
}

interface RawConfig {
  plugin?: {
    "update-in-progress"?: { old?: unknown; new?: unknown }
    init?: { "in-progress"?: unknown; done?: unknown }
  }
}

// Null when the file is missing or malformed.
async function readConfig(client: FileClient): Promise<RawConfig | null> {
  const content = await client.read(CONFIG_PATH).catch(() => "")
  if (!content) return null
  try {
    return (parseYaml(content) as RawConfig) ?? null
  } catch {
    return null
  }
}

// Both flags from a single read — the sidebar polls this every few seconds so the banners clear as
// soon as the agent drops their markers.
export async function readPluginState(client: FileClient): Promise<PluginState> {
  const plugin = (await readConfig(client))?.plugin
  const update = plugin?.["update-in-progress"]
  const init = plugin?.init
  const inProgress = init?.["in-progress"]
  return {
    update:
      update && (update.old != null || update.new != null)
        ? { old: String(update.old ?? ""), new: String(update.new ?? "") }
        : null,
    init: {
      inProgress: inProgress === true || inProgress === "true",
      done: Array.isArray(init?.done) ? init.done.filter((s): s is InitStage => INIT_STAGES.includes(s)) : [],
    },
  }
}

// ---- writing -------------------------------------------------------------
//
// Only `plugin.init.in-progress` is ours to write. Stage checkpoints and the post-update flag stay
// with the agent: it's the only one that knows whether a stage actually finished, and guessing
// would resume from the wrong place.

// Where config.yaml lives and what's in it. Null when the project isn't reachable from this
// process, so the caller falls back to the agent. Content is "" when the file doesn't exist yet.
async function editable(api: TuiPluginApi): Promise<{ dir: string; path: string; content: string } | null> {
  const dir = await localRoot(api)
  if (!dir) return null

  return { dir, path: CONFIG_PATH, content: (await readLocal(dir, CONFIG_PATH)) ?? "" }
}

// parseDocument keeps existing comments and formatting on round-trip. Null on malformed yaml —
// never rewrite what we couldn't read.
function parseConfig(content: string) {
  const doc = parseDocument(content)
  return doc.errors.length ? null : doc
}

// Stamp `in-progress` before the setup turn starts, so Resume works even if the agent dies on its
// first tool call. `resetStages` clears the checkpoints — that's Init starting over, as opposed to
// Resume, which must keep what's already done.
export async function writeInitMarker(api: TuiPluginApi, resetStages: boolean): Promise<boolean> {
  const target = await editable(api)
  if (!target) return false
  try {
    let doc = parseConfig(target.content)
    if (!doc) return false
    if (doc.contents == null) doc = parseDocument("schema: spec-driven\n") // empty or comment-only
    if (!doc.has("schema")) doc.set("schema", "spec-driven")
    doc.setIn(["plugin", "init", "in-progress"], true)
    if (resetStages || doc.getIn(["plugin", "init", "done"]) == null) doc.setIn(["plugin", "init", "done"], [])
    return await writeLocal(target.dir, target.path, doc.toString())
  } catch {
    return false
  }
}

// Dismiss on the interrupted-setup banner. Dropping a yaml block needs no judgement, so it happens
// here instead of costing the user a whole agent turn.
export async function clearInitMarker(api: TuiPluginApi): Promise<boolean> {
  const target = await editable(api)
  if (!target) return false
  if (!target.content) return true // no config at all — nothing to clear
  try {
    const doc = parseConfig(target.content)
    if (!doc) return false
    if (doc.contents == null || !doc.hasIn(["plugin", "init"])) return true // nothing to clear
    doc.deleteIn(["plugin", "init"])
    const plugin = doc.get("plugin")
    if (plugin == null || (isMap(plugin) && plugin.items.length === 0)) doc.delete("plugin")
    return await writeLocal(target.dir, target.path, doc.toString())
  } catch {
    return false
  }
}
