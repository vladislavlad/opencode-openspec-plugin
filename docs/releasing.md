# Release runbook

| Git branch | Git tags | npm channel | Supported TUI |
| --- | --- | --- | --- |
| `release/v1` | `v1.x.y` | `latest` | OpenCode 1 |
| `main` | `v2.x.y` | `opencode-v2` | OpenCode 2 |

Keep npm `latest` on 1.x while supporting installations on earlier
plugin releases. Those releases check `latest` without checking the major.
V2 uses the separate `opencode-v2` dist-tag. Use independent patches or cherry-pick
host-independent fixes into `release/v1`, then test that branch.

## First two releases

1. Verify npm Trusted Publishing for
   `@vladislavlad/opencode-openspec-plugin` points at
   `vladislavlad/opencode-openspec-plugin` and workflow `release.yml`.
2. Push `release/v1`. Merge the V2 change into `main` and wait for CI on both.
3. Tag the reviewed branch tips with the matching `package.json` versions.
   Push V1 first. Wait until it is available on npm before publishing V2.

```sh
git fetch origin
git tag -a v1.0.2 origin/release/v1 -m "OpenCode 1 maintenance release"
git push origin refs/tags/v1.0.2
npm view @vladislavlad/opencode-openspec-plugin dist-tags
```

```sh
git tag -a v2.0.0 origin/main -m "OpenCode 2 release"
git push origin refs/tags/v2.0.0
npm view @vladislavlad/opencode-openspec-plugin dist-tags
```

Expected first publication is `latest: 1.0.2` and `opencode-v2: 2.0.0`. The
old local `v1.0.0` tag predates this release and can stay local.

## Subsequent patches

Update `package.json` on the target branch, add the release notes under that
version in `src/lib/migrations.ts`, and verify with CI. Push only the
version-matching tag for the release you intend. The workflow checks the npm
channel against the version before publishing.

After publication, open a session with the released package on each supported
host. For migration, start OpenCode 2.4.1 with a fresh profile containing only
the V1 global `tui.json` entry, acknowledge the update dialog, replace the
entry in `cli.json` with `@opencode-v2`, and reopen the same fixture project. Check
that the sidebar reads the existing specs and that a workflow action is
available.
