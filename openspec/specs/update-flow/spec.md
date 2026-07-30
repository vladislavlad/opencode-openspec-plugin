## Purpose
Plugin and CLI update mechanics: npm checks, remembering launched version, detecting update bypassing Update button, migrations between versions and entire interface through which this reaches user — banners above action row and versions section in Settings.

## Requirements

### Requirement: Sources Of Installed Versions
Plugin version SHALL come from build constant `__PLUGIN_VERSION__`, substituted from `package.json`, and SHALL equal `"dev"` in checkout where substitution didn't occur. CLI version SHALL be read from field `generatedBy` in any `.opencode/skills/*/SKILL.md` — this is the version that generated instructions on disk, not the one installed system-wide.

#### Scenario: Plugin Version From Build
- **WHEN** plugin is built by `build.ts`
- **THEN** `VERSION` equals `version` value from `package.json`

#### Scenario: Dev Checkout
- **WHEN** plugin runs from sources without constant substitution
- **THEN** `VERSION` equals `"dev"`

#### Scenario: CLI Version Found
- **WHEN** at least one `SKILL.md` in `.opencode/skills` contains `generatedBy` with number like `x.y.z`
- **THEN** this number is returned, search stops on first match

#### Scenario: CLI Version Not Determined
- **WHEN** directory `.opencode/skills` doesn't exist, is empty or no `SKILL.md` has `generatedBy`
- **THEN** `null` is returned, and Settings screen shows "unknown"

### Requirement: Version Comparison By major.minor.patch
Version comparison SHALL consider only three numeric components and SHALL treat missing or non-numeric components as zeros. Pre-release suffixes and build metadata are not considered — comparison task is exactly one: decide whether an update exists.

#### Scenario: Update Exists
- **WHEN** `0.4.0` and `0.3.9` are compared
- **THEN** first is recognized strictly greater

#### Scenario: Missing Components
- **WHEN** `1.2` and `1.2.0` are compared
- **THEN** they are recognized equal — neither is strictly greater than other

#### Scenario: Non-numeric Version
- **WHEN** one of versions doesn't parse as numbers (e.g., `dev`)
- **THEN** its components are treated as zeros

### Requirement: Update Check Against npm
System SHALL request `latest` from npm registry for plugin and CLI. Requests SHALL execute in parallel, abort on 3-second timeout and yield `null` on any error, so slow or unavailable registry doesn't block sidebar. Result SHALL carry separate reachability indicator distinguishing "everything fresh" from "couldn't check". Check SHALL execute once per working directory and by Check Versions button, but not on poll.

#### Scenario: Registry Responded
- **WHEN** request to `registry.npmjs.org` returned `latest` with `version` field
- **THEN** this version is compared with installed one, and if superior, update offer is formed

#### Scenario: Registry Unavailable
- **WHEN** request ended with error, non-ok response or exceeded 3 seconds
- **THEN** result equals `null`, exception doesn't propagate out, sidebar continues working

#### Scenario: Reachability Indicator
- **WHEN** at least one of two requests returned a version
- **THEN** registry is considered reachable; if both returned `null` — unreachable, and Check Versions button shows warning toast

#### Scenario: CLI Update Without Known Current Version
- **WHEN** CLI version on disk is not determined
- **THEN** CLI update isn't offered — nothing to compare against

#### Scenario: Check Doesn't Run On Poll
- **WHEN** sidebar executes next three-second poll
- **THEN** registry requests don't execute

### Requirement: Update Prompt
System SHALL form update prompt only for components that are actually outdated, and SHALL describe plugin update as editing specifier in `tui.json`, and CLI update — as global install followed by `openspec update --force`. Prompt SHALL require touching nothing except listed steps.

#### Scenario: Finding tui.json
- **WHEN** prompt updates plugin
- **THEN** it instructs to search for `tui.json` first in `<project>/.opencode/`, then in `~/.config/opencode/`

#### Scenario: Plugin Array Entry Can Be String Or Tuple
- **WHEN** prompt describes editing entry
- **THEN** it covers both entry forms — string and tuple `[specifier, { …options }]` — and instructs to edit the string part

#### Scenario: Dev Checkout Not Updated
- **WHEN** entry in `tui.json` points to local file system path
- **THEN** prompt instructs to skip plugin update and inform user about it

#### Scenario: Update Flag Written Along With Edit
- **WHEN** prompt updates plugin
- **THEN** it instructs to write block `plugin.update-in-progress` with fields `old` and `new` into `openspec/config.yaml`, preserving `schema`, `context` and `rules`, and create file with `schema: spec-driven` if it doesn't exist yet

#### Scenario: CLI Update Only
- **WHEN** only CLI is outdated
- **THEN** prompt contains no steps about `tui.json` and doesn't write flag — plugin migrations don't run

#### Scenario: Prompt Completion
- **WHEN** prompt is assembled for any set of components
- **THEN** it ends with instruction to ask user to restart opencode

### Requirement: Remembering Last Launched Plugin Version
System SHALL store version of plugin launched last time in `kv` under key `openspec.lastVersion` and provide reading and writing this value.

#### Scenario: Reading Saved Version
- **WHEN** `readLastVersion(api)` is called and string exists in `kv` under key `openspec.lastVersion`
- **THEN** this string is returned

#### Scenario: No Entry Yet
- **WHEN** `readLastVersion(api)` is called and no value exists under key
- **THEN** `null` is returned

#### Scenario: Value Is Corrupted
- **WHEN** non-string value lies under key
- **THEN** `readLastVersion` returns `null` — corrupted entry equals its absence

#### Scenario: Fixing Current Version
- **WHEN** `recordVersion(api)` is called
- **THEN** build constant `VERSION` is written to `kv` under key `openspec.lastVersion`

### Requirement: Detecting Version Change Between Launches
System SHALL compute pending migration range from saved version: range returns only when saved version is strictly below loaded one.

#### Scenario: Plugin Updated Bypassing Button
- **WHEN** saved version is `0.3.0`, and loaded is `0.4.0`
- **THEN** range `{ old: "0.3.0", new: "0.4.0" }` returns

#### Scenario: First Launch Of Build With This Mechanism
- **WHEN** saved version doesn't exist
- **THEN** `null` returns — where user came from is unknown, and showing release notes retroactively isn't possible

#### Scenario: Version Didn't Change
- **WHEN** saved version matches loaded one
- **THEN** `null` returns

#### Scenario: Rollback To Earlier Version
- **WHEN** saved version is above loaded one
- **THEN** `null` returns — migrations apply only forward

### Requirement: Migration Display Decision Unifies Both Sources In One Place
System SHALL compute post-update banner decision with one function, independent of reactive layer, and SHALL receive "are there migration entries in range" check as parameter, not import. Decision takes flag from config.yaml, saved version and loaded version, and returns one of three: show migration (with indicator whether to clear flag), ask for restart, or show nothing (with indicator whether to fix version).

#### Scenario: Flag Takes Priority Over Saved Version
- **WHEN** both flag and saved version drift exist
- **THEN** range from flag is used — it alone knows exact version departed from

#### Scenario: During Unfinished Update Version Isn't Fixed
- **WHEN** flag is present, regardless of whether its new version matches loaded one
- **THEN** decision doesn't ask to fix version — otherwise range would be lost before migration completion

#### Scenario: Fixing Version When Nothing To Show
- **WHEN** no flag and nothing to show banner for, but saved version differs from loaded one
- **THEN** decision asks to fix loaded version, so check stays silent until next change

### Requirement: Migrations Table Is Maintained By Release Versions
Migration entries SHALL be stored by key — release version that introduces them, and each SHALL carry two parts: steps for agent (`instructions`, empty when nothing to do) and release notes for paraphrasing to user. Range selection SHALL take half-open interval `(old, new]` — version departed from isn't replayed, version arrived at is applied — and SHALL return entries from old to new.

#### Scenario: Range Across Several Releases
- **WHEN** user left from `0.1.0` and arrived at `0.3.0`, with entries for `0.1.0`, `0.2.0` and `0.3.0`
- **THEN** entries `0.2.0` and `0.3.0` return in exactly this order

#### Scenario: No Entries In Range
- **WHEN** no entry falls within range
- **THEN** "is there anything to show" check answers negatively, and banner from this source doesn't appear

### Requirement: Update Completion Prompt
Update completion prompt SHALL consist of sequential stages, each separated by `---` before and after block. Context stage SHALL name version range and report about restart (without separators). Migration stage SHALL start with imperative instruction "execute these steps" and list `instructions` by versions; if no steps — stage is skipped entirely. Flag removal stage SHALL be present only for range from `plugin.update-in-progress` and contain instruction to delete block, preserving rest of config.yaml content. Release notes stage SHALL start with `## Release Notes` heading, then instruction "tell user about news", then list release notes by versions as bullet lists (`- Item text`). Each stage (migration, flag removal, release notes) SHALL be separated by `---` before and after block. Agent SHALL execute migration and flag removal stages silently and include in response to user only release notes stage.

#### Scenario: Steps Exist In Range
- **WHEN** at least one entry in range has non-empty `instructions`
- **THEN** prompt contains migration stage with imperative heading, steps by versions and separators `---` before and after block

#### Scenario: No Steps, Only Release Notes
- **WHEN** all entries in range have empty `instructions`
- **THEN** migration stage is skipped entirely, prompt proceeds to next stage

#### Scenario: Range From Flag
- **WHEN** range obtained from `plugin.update-in-progress`
- **THEN** prompt contains separate stage with instruction to delete block `plugin.update-in-progress`, preserving rest of config.yaml content, separated by `---`

#### Scenario: Agent Doesn't Paraphrase Actions
- **WHEN** agent receives prompt with separated stages and separators
- **THEN** agent executes migration and flag removal silently, and passes user only summary from release notes

#### Scenario: Release Notes Have Section Heading
- **WHEN** release notes stage is assembled
- **THEN** it starts with `## Release Notes` heading before any version blocks

#### Scenario: Release Notes Items Are Bullet List
- **WHEN** a migration entry has multiple release note items
- **THEN** each item renders as a separate bullet list line (`- Item text`) instead of being joined into a paragraph

### Requirement: Update Availability Warning Banner In Sidebar
Sidebar SHALL show banner above action row (Explore/Propose) if plugin or CLI update is available.

#### Scenario: Show Banner With Updates Available
- **WHEN** `pluginUpdate` or `cliUpdate` are not `null` and banner not dismissed
- **THEN** line with `textMuted` text about available updates, Dismiss button (`warn`) and Settings button (`accent`) displays

#### Scenario: Hide Banner On Dismiss
- **WHEN** user presses Dismiss
- **THEN** banner hides until next data reload or Check Versions press in Settings

#### Scenario: Pressing Settings In Banner
- **WHEN** user presses Settings in banner
- **THEN** Settings screen opens, banner remains hidden

#### Scenario: Banner Not Shown Without Updates
- **WHEN** updates unavailable or check ended with error
- **THEN** banner doesn't display, action row visible immediately

### Requirement: Post-update Banner In Sidebar
Sidebar SHALL show "Run checks after update" banner above action row when there's a pending migration range. Range comes from two sources: flag `plugin.update-in-progress` in config.yaml and version growth saved in `kv`. Flag takes priority — it alone knows exact version departed from.

#### Scenario: Show Banner After Reload
- **WHEN** plugin loads, `updateFlag` contains `{ old, new }` and `flag.new === VERSION`
- **THEN** banner with text about need to complete update and Complete Update button (`accent`) displays

#### Scenario: New Version Didn't Pick Up
- **WHEN** `updateFlag` contains `{ old, new }`, but `flag.new !== VERSION`
- **THEN** message "Reopen opencode to finish updating..." shows with Reopen OpenCode button (`error`), which closes opencode; migrations don't run

#### Scenario: Update Passed Bypassing Update Button
- **WHEN** no flag in config.yaml, saved version in `kv` is below loaded one, and for range there's at least one `MIGRATIONS` entry
- **THEN** same banner displays with Complete Update button for range from saved version to loaded one

#### Scenario: Nothing To Show In Range
- **WHEN** saved version is below loaded one, but no `MIGRATIONS` entries in range
- **THEN** banner doesn't show, and version silently fixes in `kv`

#### Scenario: Nothing To Show From Start
- **WHEN** saved version doesn't exist, or matches loaded one, or is above it
- **THEN** banner doesn't show, and version silently fixes in `kv`

#### Scenario: Both Sources Indicate Update
- **WHEN** both flag `plugin.update-in-progress` and version drift in `kv` exist
- **THEN** range from flag is used, banner shows once

#### Scenario: Pressing Complete Update
- **WHEN** user presses Complete Update while agent idle
- **THEN** plugin forms prompt from migration instructions for pending range and sends to agent directly; buttons lock until agent turn completes

#### Scenario: Prompt For Range From kv Doesn't Clear Flag
- **WHEN** pending range obtained from `kv`, not from flag
- **THEN** prompt doesn't contain requirement to delete `plugin.update-in-progress` from config.yaml — nothing to clear

#### Scenario: Complete Update Locked During Agent Work
- **WHEN** agent is busy and user presses Complete Update
- **THEN** prompt isn't sent, toast "Wait until the agent finishes working" shows

#### Scenario: Successful Migration Completion
- **WHEN** agent completed turn after Complete Update
- **THEN** sidebar fixes `VERSION` in `kv`, and banner from this source no longer appears

#### Scenario: Flag Cleared By Agent
- **WHEN** agent completed turn after Complete Update and cleared `plugin.update-in-progress` from config.yaml
- **THEN** `updateFlag` becomes `null`, banner hides

### Requirement: Versions Section In Settings
Sidebar SHALL show in Settings screen a versions section with current plugin and openspec CLI versions, available updates and control buttons.

#### Scenario: Displaying Plugin Version
- **WHEN** Settings screen is open
- **THEN** line "Plugin version" on left and current version value (e.g., `0.2.0`) on right display on same line

#### Scenario: Plugin Update Available
- **WHEN** `pluginUpdate` is not `null`
- **THEN** below version line text "x.y.z version available" and Update button in next line display

#### Scenario: Displaying openspec CLI Version
- **WHEN** Settings screen is open
- **THEN** line "OpenSpec CLI" on left and current version value (`generatedBy`) on right display; if version not determined — "unknown"

#### Scenario: CLI Update Available
- **WHEN** `cliUpdate` is not `null`
- **THEN** below version line text "x.y.z version available" and Update button in next line display

#### Scenario: Check Versions Button
- **WHEN** Settings screen is open
- **THEN** at bottom of versions section Check Versions button displays, which calls plugin function `checkVersions` (without agent turn) to restart update check

#### Scenario: Pressing Update For Component
- **WHEN** user presses Update next to plugin or CLI line while agent idle
- **THEN** plugin sends `buildUpdatePrompt` with this component via `sendPrompt`, buttons lock until agent turn completes; after update message "Reload opencode to update plugin" and Reload button (`error`) display, closing opencode

#### Scenario: Update Locked During Agent Work
- **WHEN** agent is busy and user presses Update or Update All
- **THEN** prompt isn't sent, toast "Wait until the agent finishes working" shows

#### Scenario: Update All Button
- **WHEN** at least one update (plugin or CLI) is available
- **THEN** at bottom of versions section Update All button displays, which sends `buildUpdatePrompt` only with actually outdated components

#### Scenario: Updates Unavailable — Update All Hidden
- **WHEN** updates unavailable or check hasn't executed yet
- **THEN** Update All button doesn't display, only Check Versions visible

### Requirement: Check Versions And Reload Buttons Lock During Agent Work
Check Versions button SHALL be locked when agent is busy. Pressing locked button SHALL NOT start update check and SHALL show toast "Wait until the agent finishes working". Reload button SHALL be locked when agent is busy. Pressing locked button SHALL NOT close opencode and SHALL show same toast.

#### Scenario: Check Versions Locked
- **WHEN** agent is busy and user presses Check Versions in Settings
- **THEN** update check doesn't start, toast "Wait until the agent finishes working" shows

#### Scenario: Reload Locked
- **WHEN** agent is busy and user presses Reload in Settings
- **THEN** opencode doesn't close, toast "Wait until the agent finishes working" shows

#### Scenario: Buttons Unlocked When Idle
- **WHEN** agent is free
- **THEN** both buttons are active and execute their actions on press
