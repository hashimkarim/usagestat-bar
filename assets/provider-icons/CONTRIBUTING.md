# Contributing

`main` is the integration branch. Keep changes focused, include generated files
with their source changes, and retire completed branches after integration.
Release tags and published archives are immutable.

## Develop

Use Node.js 24 and Python 3.10 or newer for the development tools.

```sh
npm ci
npm run build
npm test
```

Tests verify catalogue coverage, original artwork, pinned source hashes, safe
SVG extraction, search, DOM/React APIs, TypeScript, hydration and tree shaking.
`npm run release:prepare` additionally installs the packed artifact without
React and with React 18/19, and vendors it under optimized Python. CI checks
Node 22/Python 3.10 and Node 24/Python 3.12. See [releasing](docs/releasing.md).

## Update artwork

The canonical inputs are `assets/`, `sources/`, `provenance.json` and the build
scripts. `manifest.*`, `svg-data.js`, `react/` and named React exports are
generated. Do not hand-edit those outputs or copied catalogues in consumers.

Refresh the complete LobeHub catalogue:

```sh
npm run sync:lobehub -- --latest
npm run sync:colours
npm run sync:discovery
npm run build
npm test
```

The importer resolves one immutable upstream commit, verifies Git blobs and
records SHA-256 provenance. Omit `--latest` to replay the recorded source, or
use `--ref` with a full commit SHA. Existing local artwork is preserved;
unexpected variants and changed local imports require review.

## Review an upstream pull request

```sh
npm run sync:lobehub-prs -- --add-pr 425
npm run sync:discovery
npm run build
npm test
```

Replace the example PR number with the contribution being reviewed. The import
records source, hashes and geometry mappings at its exact revision. It extracts
static SVG from TypeScript without executing upstream modules. Unknown expressions,
unsafe markup, overwrites and collisions stop the import. Inspect every variant
visually before including it. Run `npm run sync:lobehub-prs` for offline replay.

Keep [the PR import notes](docs/lobehub-pull-requests.md), attribution and explicit
omissions current. A contribution being imported here does not imply it was merged
upstream. Retain retired artwork and public IDs when updating sources.

The [1.x compatibility policy](docs/stability.md) applies to every source update.
`tests/fixtures/public-api-v1.json` records the public contract introduced in 1.0.
Tests permit additions but reject removed or remapped IDs, aliases, component
names, members, asset paths, entrypoints and exports. Never regenerate this file
to accept a breaking source change: preserve the existing contract in the importer.
When a minor release adds public API, append its new entries to the baseline
without deleting or changing existing ones. Keep the manifest schema and consumer
TypeScript tests current too; automated checks complement API review.

## Metadata and documentation

Categories and alternate names come from pinned upstream documentation. Colour
metadata comes from literal source definitions, not pixel sampling. Builds reject
stale source revisions or changed digests. The separate
[colour-source audit](https://github.com/agenticdriver/provider-icons/tree/main/research/brand-colours) is research for review,
not a replacement runtime palette.

Keep the README focused on discovery and a quick start. Put API details in
[docs/api.md](docs/api.md), installation variants in
[docs/installation.md](docs/installation.md), and maintainer procedures in
[docs/releasing.md](docs/releasing.md). Use shieldcn badges that reflect real
availability and verify their light/dark rendering.

Consumers should read the installed manifest or API rather than maintain an
icon list. The AgenticDriver gallery refreshes its verified package at build time;
native consumers pin an archive digest. No icon fetch is needed during rendering.
