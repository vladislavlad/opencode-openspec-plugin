# Opencode OpenSpec plugin

A TUI sidebar plugin for [opencode](https://opencode.ai) that brings the
[OpenSpec](https://github.com/Fission-AI/OpenSpec) workflow into the terminal:
browse the living specs, review change proposals, and drive the
spec → change → implement → archive loop without leaving your editor.

## Features

- **Sidebar for OpenSpec** – lists change proposals and specs from your repo's
  `openspec/` (or `.openspec/`) directory, with live polling as files change.
- **Change review** – open a proposal and read *what / why / how* at a glance.
- **Slash commands** – registers OpenSpec commands so you can create, validate,
  and archive changes directly from opencode.
- Rendered with Solid via `@opentui/solid`, so it feels native to the opencode TUI.

## Requirements

- [opencode](https://opencode.ai) `>= 1.18.0`
- The [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) installed globally — the `/opsx-*`
  commands shell out to the `openspec` binary. Install it with your package manager, e.g.
  `npm install -g @fission-ai/openspec`. The sidebar's **Init** button can also install it for you.

## Install

TUI plugins are configured in opencode's **`tui.json`** (not `opencode.json`).
Add the plugin to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@vladislavlad/opencode-openspec-plugin"]
}
```

opencode resolves the package from npm on next launch. The sidebar appears in the
session panel; open it in a project that has (or will have) an `openspec/` directory.

## Usage

### First run — the Init button

If the current project has no OpenSpec set up yet, the sidebar shows an **Init**
button. This asks the agent to:

1. run `openspec init --tools opencode` (installs the OpenSpec CLI tooling and its
   `/opsx-*` commands + skills into `.opencode/`);
2. set up `openspec/config.yaml` (stack, spec language, project context);
3. optionally derive baseline specs from your existing code;
4. invite you to write your first change proposal.

Once specs exist, the sidebar switches to the browser: **Active / Completed
Changes** and **Specifications**, with task progress and drill-in into individual
specs and requirements. Change rows expose **Apply / Update / Archive** actions.

### Commands

The plugin registers two palette commands (type `/` in opencode):

| Command | What it does |
| --- | --- |
| `/opsx-config` | Configure project context — stack, spec language, rules — in `openspec/config.yaml`. |
| `/opsx-baseline` | Configure, then derive/refresh `openspec/specs` from the existing implementation. |

After `openspec init`, the OpenSpec tooling adds the core workflow commands:

| Command | What it does |
| --- | --- |
| `/opsx-propose <feature>` | Create a change proposal for a new feature or change. |
| `/opsx-apply <change>` | Implement an approved change. |
| `/opsx-update <change>` | Revise an existing change proposal. |
| `/opsx-archive <change>` | Fold a completed change back into the specs. |
| `/opsx-explore` | Explore the specs / codebase before proposing. |
| `/opsx-sync` | Reconcile specs with the current state. |

## Development

This repo uses [Bun](https://bun.sh) for building. Sources live in `src/` and are
bundled into a single `dist/index.js` via `bun build` with `@opentui/solid`'s Solid
transform (universal codegen). `@opentui/*` and `solid-js` are kept external so the
plugin shares opencode's single Solid runtime at load time.

```bash
bun install
bun run build      # regenerate dist/
bun test           # run tests
```

The published package ships only `dist/`; `prepublishOnly` rebuilds it before
every publish so the artifact always matches source.

## Release

Releases are automated via GitHub Actions – pushing a `v*` tag builds and
publishes to npm. See [`.github/workflows/release.yml`](.github/workflows/release.yml).

```bash
npm version patch      # bumps package.json + creates a git tag
git push --follow-tags
```

## License

[MIT](LICENSE) © Vladislav Kartashov
