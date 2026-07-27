// The plugin's own version, remembered across restarts in `kv`. Comparing it with the build
// constant catches an update that happened outside the sidebar's Update button – a manual
// `npm i -g`, a hand-edited tui.json, or an unpinned specifier that opencode refreshed on launch.
// Those never leave the `plugin.update-in-progress` flag, so without this the migrations for them
// would never run.
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { semverGt } from "./updates"
import { VERSION } from "./version"

const KEY = "openspec.lastVersion"

// Null when there's no record, or the stored value isn't a version string.
export function readLastVersion(api: TuiPluginApi): string | null {
  const stored = api.kv.get<unknown>(KEY)
  return typeof stored === "string" && stored ? stored : null
}

export function recordVersion(api: TuiPluginApi) {
  api.kv.set(KEY, VERSION)
}

// The range to migrate, or null when there's nothing to do: no record yet (we don't know where the
// user came from, so replaying every release note would be made up), the same version, or a
// downgrade – migrations only apply forwards. This fires in a dev checkout as well: `build.ts` bakes
// the `package.json` version into every build, so a version bump plus a rebuild is indistinguishable
// from an update – which is right, that's what it is.
export function pendingVersionRange(last: string | null, current = VERSION): VersionRange | null {
  return last && semverGt(current, last) ? { old: last, new: current } : null
}

// Same shape as config.ts's `UpdateFlag` on purpose, so a flag can be passed straight in – but a
// different thing: that one is a marker on disk, this is a pair of versions to migrate between.
export interface VersionRange {
  old: string
  new: string
}

export type MigrationDecision =
  // Offer Complete Update. `fromFlag` decides whether the prompt also clears config.yaml.
  | { show: "migrate"; range: VersionRange; fromFlag: boolean }
  // An update turn ran but its build isn't the one loaded – nothing to migrate until it is.
  | { show: "reopen"; range: VersionRange }
  // No banner. `record` asks the caller to stamp the running version so this stays quiet.
  | { show: "none"; record: boolean }

// The whole post-update decision in one place, kept free of Solid so the table below is testable:
// two sources × (first run / same / newer / downgrade / range with no notes).
//
// `hasEntries` is injected rather than imported so a test doesn't ride on the real MIGRATIONS table,
// which changes every release.
export function decideMigration(input: {
  flag: VersionRange | null
  last: string | null
  current: string
  hasEntries: (old: string, next: string) => boolean
}): MigrationDecision {
  const { flag, last, current, hasEntries } = input

  // The flag wins: it's the only source that knows the exact version we left from. Nothing is
  // recorded while an update is in flight – that happens once the migration turn ends.
  if (flag) {
    return flag.new === current ? { show: "migrate", range: flag, fromFlag: true } : { show: "reopen", range: flag }
  }

  const range = pendingVersionRange(last, current)
  if (range && hasEntries(range.old, range.new)) return { show: "migrate", range, fromFlag: false }

  // Nothing to announce – remember this version so the check stays quiet until it changes again.
  return { show: "none", record: last !== current }
}
