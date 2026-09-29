# Releasing

Release from a clean, committed `main`. Version numbers come from `package.json`;
`manifest.json` must match. Stable versions use npm's `latest` channel and
`-alpha.N` versions use `alpha`. Never replace a tag or an existing archive.

## Distribution

| Destination | Package or artifact | Publication |
| --- | --- | --- |
| npm | `@agenticdriver/provider-icons` | `publish.yml`, using npm trusted publishing |
| jsDelivr / UNPKG | The public npm package and its SVG files | Automatic CDN mirrors; verify exact versioned URLs |
| GitHub Releases | `agenticdriver-provider-icons-VERSION.tgz` and `SHA256SUMS` | The same checked archive used for npm |

pnpm, Yarn, Bun and Deno use npm, so they need no separate publisher. Native
consumers use the SVG/JSON archive. JSR would duplicate this package's distribution;
Deno already consumes it through `npm:`. A Python/Rust wrapper, OS package,
desktop-store listing or container would not add a maintained API or application.
Those are not release targets. GitHub Packages also adds registry authentication
for consumers without improving access to this public library.

## Prepare a release

1. Review the [stability policy](stability.md), update `CHANGELOG.md`, and set the
   version in `package.json` and `package-lock.json`. Set `publishConfig.tag` to
   `latest` for stable releases or `alpha` for prereleases.
2. Run `npm run build`; update version-pinned installation examples. For new public
   API, extend the compatibility baseline while preserving its existing entries.
3. Commit the changes, reconcile with live `origin/main`, and push `main`.
4. Ensure [Package checks](https://github.com/agenticdriver/provider-icons/actions/workflows/ci.yml) succeeds.

For a local candidate, after committing:

```sh
npm ci
npm run release:prepare
```

Preparation runs the complete test suite, packs committed files using their Git
file modes, checks the archive's included files and installs it into isolated consumers without React and with
React 18/19. It also runs the packed native vendor with Python optimization enabled
and verifies every vendored asset. CI covers Node 22/24 and Python 3.10/3.12.
`work/release/` contains the archive, `SHA256SUMS`, and a candidate
record with the exact source commit and SHA-256/SHA-512 digests. Generated drift,
uncommitted inputs and an archive exceeding the native vendor limit fail the check.
Use the workflow's Node 24 and npm 11.20.0 when reproducing archive bytes locally.

## Publish

Dispatch [Publish package](https://github.com/agenticdriver/provider-icons/actions/workflows/publish.yml)
from `main`, choosing `all`, `npm` or `github`:

```sh
gh workflow run publish.yml --repo agenticdriver/provider-icons --ref main -f target=all
```

The workflow runs on a GitHub-hosted Ubuntu runner, prepares and tests one archive,
saves it as an Actions artifact, publishes npm through OIDC, then attaches the same
bytes to GitHub Releases. npm's trusted publishing currently requires a supported
hosted runner; the publishing job deliberately does not use a self-hosted runner.
The GitHub release remains a draft until both uploaded files have been downloaded
and compared. Prerelease versions remain GitHub prereleases.

Each destination can be retried separately. An existing npm version is accepted
only if its identity, integrity and downloaded bytes match; its distribution tags
are left alone. Authentication errors, rate limits and outages are never treated
as an absent version. Existing GitHub tags and asset bytes must also match.
No retry unpublishes, force-pushes or overwrites assets.

The equivalent local commands publish the already prepared archive:

```sh
npm run release:npm
npm run release:github
```

The source commit must belong to live `origin/main`. Local npm publication uses
your native registry login and may require npm's publishing verification. GitHub
publication uses `gh` authentication. Keep credentials out of source and artifacts.

## Trusted publisher

The first real package upload uses an organization member's npm login because
npm requires the package to exist before configuring its trusted publisher.
Configure this exact relationship after that first upload:

```sh
npm trust github @agenticdriver/provider-icons \
  --repository agenticdriver/provider-icons \
  --file publish.yml \
  --allow-publish --yes
npm trust list @agenticdriver/provider-icons
```

No GitHub environment is part of this binding. The workflow grants `id-token:
write` and requests direct `npm publish`; it does not use a stored `NPM_TOKEN`
or a staged-publish fallback. The workflow itself restricts execution to this
repository's `main`. Do not change unrelated package owners or authentication
policies while configuring the relationship.

Use npm 11.15 or newer for the setup CLI. Current requirements and commands are
documented by [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
and [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/).
Configuration readback proves the binding exists; a successful OIDC upload is
the evidence that the workflow can publish. Public OIDC releases also carry npm
provenance linking the published artifact to the repository and workflow.

## Verify and adopt

```sh
npm run release:verify
npm view @agenticdriver/provider-icons dist-tags --json
```

Install the exact registry version into a fresh project and run a core lookup and
React render. Fetch a versioned SVG through both CDNs and compare it with the
package asset. CDN propagation can lag the registry, so do not mistake a transient
404 for a missing release. Check the linked shieldcn badges and public README.

The website checks for a newer GitHub archive at build time and verifies its
checksum. Publishing a library release does not itself deploy that website.
Native consumers should update their explicit version and digest before vendoring.
