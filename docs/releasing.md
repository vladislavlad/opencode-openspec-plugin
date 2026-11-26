# Release runbook

| Git branch | Git tags | npm package | npm tag |
| --- | --- | --- | --- |
| `release/v1` | `v1.x.y` | `@vladislavlad/opencode-openspec-plugin` | `latest` |
| `main` | `v2.x.y` | `@vladislavlad/opencode-v2-openspec-plugin` | `latest` |

Both branches use `.github/workflows/release.yml`. It checks the Git tag
against the manifest version and verifies that the npm package matches the
major version. A version already in the registry passes only when its
recorded Git revision matches the checked-out commit.

## First V2 publication

Trusted Publishing settings belong to an existing npm package. For the first
V2 release, publish from the reviewed, clean `main` checkout with an
authenticated npm account that owns the scope.

```sh
git switch main
git pull --ff-only
bun install --frozen-lockfile
npm login
npm publish --access public --tag latest
```

Wait for `npm view @vladislavlad/opencode-v2-openspec-plugin@latest version gitHead`
to show `2.0.0` and the checked-out commit. Then add a GitHub Actions trusted
publisher in the **V2 package** settings. Use owner `vladislavlad`, repository
`opencode-openspec-plugin` and workflow filename `release.yml`. Enable direct
publishing for that workflow.

```sh
git tag -a v2.0.0 -m "OpenCode 2 release"
git push origin refs/tags/v2.0.0
```

The workflow validates the release and verifies the existing npm package.
The first V2 version can also be created with npm staged publishing and
approved by the maintainer before pushing its tag.

## Later releases

Update the manifest version and release notes on the target branch. Wait for
CI before tagging and pushing the matching version. Use `release/v1` for
OpenCode 1 maintenance and `main` for OpenCode 2 releases.

For releases after the first V2 publication, GitHub Actions publishes to the
appropriate package using its Trusted Publishing configuration. Verify the
new version on that package's npm `latest` tag before updating installation
instructions that pin it.

```sh
npm view @vladislavlad/opencode-openspec-plugin dist-tags
npm view @vladislavlad/opencode-v2-openspec-plugin dist-tags
```

## Migration smoke test

Open a project with OpenCode 1.19.6 and the V1 package. In OpenCode 2.4.1
or newer, replace the migrated package entry in `cli.json` with
`@vladislavlad/opencode-v2-openspec-plugin@latest`, keeping any options.
Reopen the same project and check that its specs and workflow actions
are available. The V1 1.0.2 maintenance patch displays the new package name
in the update dialog.
