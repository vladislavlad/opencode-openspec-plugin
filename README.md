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

**Buttons that write the prompt for you.** Explore, Propose, Apply, Update,
Archive and Delete are all there. Apply and Update drop the command into the
prompt so you can add context before sending; Archive and Explore submit right
away. Everything that starts an agent turn greys out while one is already
running.

**Setup and updates handled.** A first-run **Init** button installs the OpenSpec
CLI, configures the project and derives specs from your existing code. Settings
shows the installed plugin and CLI versions, checks npm for newer ones, and can
apply the update for you.

## Requirements and installation

Plugin **1.0.0** is the maintenance release for OpenCode 1, tested on
**OpenCode 1.19.6** and **OpenSpec 2.2.0**. OpenCode supplies the runtime
dependencies when it loads the plugin. Add it to `tui.json`:

```json
{
  "plugin": ["@vladislavlad/opencode-openspec-plugin@1.0.0"]
}
```

For an unpinned installation, npm `latest` stays on the V1 line. OpenCode 2
uses the `opencode-v2` npm channel. Install OpenSpec 2.2.0 with the
[OpenSpec installation guide](https://openspec.dev/start/installation) or the
plugin's **Init** action.

## First run

In a project with no OpenSpec set up, the sidebar shows an **Init** button. It
hands the agent one turn that:

1. installs the OpenSpec CLI if it's missing (it'll ask which package manager to use);
2. runs `openspec init --tools opencode --profile core --scope project`,
   which installs project skills under `.agents/skills/`;
3. asks about your stack, spec language and project context, and writes them to
   `openspec/config.yaml`;
4. offers to reverse-engineer baseline specs from your existing code – and asks how
   deeply to study it first, since **Deep** costs noticeably more time and tokens
   than **Overview**;
5. validates the result and points you at **Explore** and **Propose** for your first
   change proposal.

Progress is checkpointed stage by stage. If the turn is interrupted, the sidebar
says where it stopped and offers **Resume** – which picks up from the first
unfinished stage – or **Dismiss**.

The commands from step 2 only load properly when opencode restarts, so you'll see
a **Reload OpenCode** prompt once setup finishes.

## Commands

The plugin registers two of its own (type `/` in opencode):

| Command | What it does |
| --- | --- |
| `/opsx-config` | Configure project context – stack, spec language, rules – in `openspec/config.yaml`. |
| `/opsx-baseline` | Derive or refresh `openspec/specs` from the existing implementation. Needs a configured project – run `/opsx-config` first. |

OpenSpec 2.2 installs workflow skills under `.agents/skills/`. The sidebar
uses these skills when the matching legacy `/opsx-*` command is absent.
To upgrade an existing project, run `openspec update --dry-run` and then
`openspec update`. Save any local skill customizations before updating.

## Updates and OpenCode 2 migration

Settings checks npm `latest` for plugin updates within 1.x. Use
**Refresh OpenSpec** to check the CLI and refresh the project skills when no
tooling version is recorded. Restart OpenCode to load newly installed skills.

When OpenCode 2.4.1 migrates a global `tui.json` with plugin 1.0.0, its
TUI loads an update dialog. Replace the OpenSpec entry in the global
`cli.json` under `plugins` with
`@vladislavlad/opencode-openspec-plugin@opencode-v2`, preserving any options, then
reopen OpenCode. If `cli.json` already exists or you used a project-local
V1 config, add the V2 entry there manually. The minimum V2 plugin is
`2.0.0`. An OpenCode upgrade keeps the project files and setup checkpoints.

## Development

Built with [Bun](https://bun.sh). Sources in `src/` are bundled into a TUI entry and renderer chunk in
`dist/` using `@opentui/solid`'s Solid transform (universal codegen).
Development pins OpenTUI to 0.4.5, the version used by the OpenCode 1.19.6 host,
and OpenSpec to 2.2.0 for CLI compatibility tests. These checks exercise real
OpenSpec initialization and compare task progress with its parser, including
nested and ordered tasks and unfinished checkbox markers.
`@opentui/*` and `solid-js` stay external, so the plugin shares opencode's single
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

The published package ships only `dist/`; `prepublishOnly` rebuilds it before
every publish so the artifact always matches source. See [AGENTS.md](AGENTS.md)
for the code layout and conventions.

## Release

Pushing a `v*` tag builds and publishes to npm – see
[`.github/workflows/release.yml`](.github/workflows/release.yml).

```bash
npm version patch && git push --follow-tags
```

## License

[MIT](LICENSE) © Vladislav Kartashov
