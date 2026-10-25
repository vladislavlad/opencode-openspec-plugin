# Opencode OpenSpec plugin

A TUI sidebar for [opencode](https://opencode.ai) that brings the
[OpenSpec](https://github.com/Fission-AI/OpenSpec) workflow into the terminal.
Your specs and in-flight changes sit next to the chat, and the buttons hand the
work to the agent – so you drive spec → change → implement → archive without
leaving opencode.

## What you get

**Specs, browsable.** Every capability under `openspec/specs/` is listed with its
requirement count. Open one to read its Purpose and requirements; open a
requirement to unfold its When/Then scenarios.

**Search that goes all the way down.** Type in the search box above the list and
it filters on everything a spec contains – name, title, Purpose, and the text of
every requirement and scenario. Multi-word queries have to match all words, but
they can match in different places. Rows report how many requirements matched, so
you can see where the hit came from. The query follows you into a spec and
filters its requirements there too.

**Changes with live progress.** Active and completed changes each get a section,
with a task-progress bar per change and a rolled-up bar on the collapsed header.
Open a change to see its tasks grouped and ticked off as the agent works – the
sidebar re-reads the files every few seconds, so it keeps up on its own.
Nested tasks keep their hierarchy, ordered lists keep their numbers, and markers
such as `[~]` remain visible as unfinished work. Only `x`/`X` checkboxes count as
done, matching OpenSpec. Empty descriptions show as **Untitled task**. Once all
tasks are checked, the card reminds you to review before archiving.

**Actions with an editable command.** Explore, Propose, Apply and Update open
an OpenCode dialog: edit the command, press Enter to run or Esc to cancel.
Your main draft stays intact. Archive submits directly; Delete asks for confirmation.
Actions wait while the agent is running, and failed submissions show an error.

Explore runs in **Plan**. All other actions that ask the agent to work — including
Propose, Apply, Archive, Init, Config, Baseline and updates — run in **Build**.
They use the model and variant you selected in OpenCode. The command dialog shows
the agent, provider/model and variant before you run it; cancelling leaves the
session settings unchanged. Editing a command so it needs a different agent shows
the new settings before submission. Select a model in OpenCode first if none is set.
The session keeps the execution agent after submission; the plugin does not switch
it back while work is running.

Sidebar actions use the configured command's template and arguments, but ignore
its `agent`, `model`, `subagent` and `subtask` settings so the displayed execution
settings stay authoritative. Templates come from OpenCode's ordered configuration
sources, including project and global command files. Shell interpolation (`!` followed
by a backtick-delimited command) is unsupported here: replace it with instructions
for the agent. An unavailable or unsupported template shows an error before a turn
starts. Commands typed directly into OpenCode's composer retain native behavior.

Project command files may link to shared templates elsewhere inside the project.
Malformed YAML or invalid command fields are skipped before choosing the next valid
definition, matching OpenCode's source order. Frontmatter is parsed as data; executable
JavaScript frontmatter is unsupported.

**Setup and updates handled.** A first-run **Init** button installs the OpenSpec
CLI, configures the project and derives specs from your existing code. Settings
shows the installed plugin and CLI versions, checks npm for newer ones, and can
apply the update for you.

## Requirements

- [opencode](https://opencode.ai) `>= 2.1.3 < 3.0.0` (OpenCode 2)
- The [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec), installed globally –
  the `/opsx-*` commands shell out to the `openspec` binary. Either install it
  yourself (`npm install -g @fission-ai/openspec`) or let the **Init** button do it.

Plugin **2.0.0** targets **OpenCode 2.1.3** with **OpenSpec 1.14.3**.
For OpenCode V1, keep plugin **1.0.0** pinned. The full [V1 installation and usage guide](docs/v1.md) is preserved separately.

## Install

Add the CLI plugin to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["@vladislavlad/opencode-openspec-plugin@2.0.0"]
}
```

OpenCode resolves the package on launch. Open a session and its sidebar to browse
the project's `openspec/` directory. For a local development build, use an
absolute path to this repository's package directory in the same array. V2 loads
the local `tui.js` entrypoint after you run `bun run build`; a direct
`dist/index.js` entry is ignored. Published packages use the `./tui` export.

CLI settings are global: `$XDG_CONFIG_HOME/opencode/cli.json` when XDG is set,
or `OPENCODE_CONFIG_DIR/cli.json` when explicitly overridden. There is no
project-local CLI settings file. `OPENCODE_CLI_CONFIG_CONTENT` can override
its `plugins` array for the running process.

When migrating from V1, move this entry from `tui.json` to `cli.json`, use the
plural `plugins` key, and select version 2.0.0. An entry with options uses
`{"package": "@vladislavlad/opencode-openspec-plugin@2.0.0", "options": {}}`.
The OpenSpec project files and setup checkpoints stay in place. V2 starts a new
version-history store; without an update flag, the first launch does not invent
old release notes. See the [official plugin migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1/).

## First run

In a project with no OpenSpec set up, the sidebar shows an **Init** button. It
hands the agent one turn that:

1. installs the OpenSpec CLI if it's missing (it'll ask which package manager to use);
2. runs `openspec init --tools opencode`, which writes the `/opsx-*` commands and
   skills into `.opencode/`;
3. asks about your stack, spec language and project context, and writes them to
   `openspec/config.yaml`;
4. offers to reverse-engineer baseline specs from your existing code – and asks how
   deeply to study it first, since **Deep** costs noticeably more time and tokens
   than **Overview**. Before the full scan it asks whether to use **No subagents**,
   **One at a time**, or **Up to 2 at once** (recommended); you can enter a positive
   integer for another maximum. Without a usable answer or delegation tool, the
   main agent works sequentially. The same choice covers scanning and spec writing;
5. validates the result and points you at **Explore** and **Propose** for your first
   change proposal.

Progress is checkpointed stage by stage. If the turn is interrupted, the sidebar
says where it stopped and offers **Resume** – which picks up from the first
unfinished stage – or **Dismiss**.

After setup the sidebar asks OpenCode to reload commands and skills. If loading
fails, **Retry commands** retries it without closing your session.

Delegated work runs in bounded batches: five tasks with a limit of two use
**2 + 2 + 1**, waiting for each batch to finish. Children cannot delegate further,
and areas are processed one at a time. This is an instruction followed by the
agent for that run, not a hard concurrency limit enforced by OpenCode or shared
across other sessions. The same choice is offered by `/opsx-baseline` and by
Resume when specification derivation is still unfinished.

## Commands

The plugin registers two of its own (type `/` in opencode):

| Command | What it does |
| --- | --- |
| `/opsx-config` | Configure project context – stack, spec language, rules – in `openspec/config.yaml`. |
| `/opsx-baseline` | Derive or refresh `openspec/specs` from the existing implementation. Needs a configured project – run `/opsx-config` first. |

The rest come from the OpenSpec CLI after `openspec init`:

| Command | What it does |
| --- | --- |
| `/opsx-propose <feature>` | Create a change proposal for a new feature or change. |
| `/opsx-apply <change>` | Implement an approved change. |
| `/opsx-update <change>` | Revise an existing change proposal. |
| `/opsx-archive <change>` | Fold a completed change back into the specs. |
| `/opsx-explore` | Explore the specs and codebase before proposing. |
| `/opsx-sync` | Reconcile specs with the current state. |

## Staying up to date

The sidebar checks npm once per project for a newer plugin or CLI version. When
there is one, a banner appears above the actions and the **Settings** button turns
accent-coloured. From Settings you can update either component or both; the agent
edits your `cli.json`, installs the new CLI, and tells you to reload. After the
restart, **Complete Update** runs any migration steps and summarises what changed.

After V2 has recorded a first version, you get that summary however you updated. The sidebar also remembers which plugin
version last ran, so an update that bypassed the button entirely – `npm i -g`, a
hand-edited `cli.json`, or an unpinned specifier that opencode refreshed on its own –
still offers **Complete Update** on the next launch.

## Development

Built with [Bun](https://bun.sh). Sources in `src/` are bundled into a single
`dist/index.js` using `@opentui/solid`'s Solid transform (universal codegen).
Development pins OpenTUI to 0.6.6, the version used by the OpenCode 2.1.3 host,
and OpenSpec to 1.14.3 for CLI compatibility tests. These checks exercise real
OpenSpec initialization and compare task progress with its parser, including
nested and ordered tasks and unfinished checkbox markers.
`@opencode/*`, `@opentui/*` and `solid-js` stay external, so the plugin shares opencode's single
Solid runtime at load time.

```bash
bun install --frozen-lockfile
```

```bash
bun run build
```

```bash
bun run test
```

The published package ships `dist/`, the local `tui.js` entrypoint and the V1 guide; `prepublishOnly` rebuilds it before
every publish so the artifact always matches source. See [AGENTS.md](AGENTS.md)
for the code layout and conventions.

## Release

After committing a reviewed release, pushing its `v*` tag validates, builds and publishes to npm – see
[`.github/workflows/release.yml`](.github/workflows/release.yml).

```bash
git tag -a v2.0.0 -m "Release 2.0.0"
git push origin main v2.0.0
```

## License

[MIT](LICENSE) © Vladislav Kartashov
