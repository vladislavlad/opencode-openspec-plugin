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
- The [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) set up in your repo
  (an `openspec/` directory)

## Install

TUI plugins are configured in opencode's **`tui.json`** (not `opencode.json`).
Add the plugin to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@vladislavlad/opencode-openspec-plugin"]
}
```

opencode resolves the package from npm on next launch and shows the sidebar in
the session panel. Make sure you launch opencode in a project that contains an
`openspec/` directory, and that the session sidebar is open.

## Development

This repo uses [Bun](https://bun.sh) for building. Sources live in `src/` and are
transpiled with Babel (Solid universal codegen targeting `@opentui/solid`) into `dist/`.

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
