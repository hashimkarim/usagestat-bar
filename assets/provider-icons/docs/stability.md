# Stability and support

[README](../README.md) · [API reference](api.md) · [Changelog](../CHANGELOG.md)

## The 1.x contract

Version 1.0 starts the stable API. Releases follow [Semantic Versioning](https://semver.org/):

| Change | Release |
| --- | --- |
| Correct existing artwork, source attribution or discovery metadata; fix implementation bugs | Patch |
| Add icons, aliases, layouts, optional metadata or APIs | Minor |
| Remove or rename public API, narrow accepted inputs, raise minimum supported runtimes, or change documented behavior incompatibly | Major |

Within 1.x, existing icon IDs and aliases keep their identity. Existing React
export names and layout members remain available, as do SVG filenames under
`@agenticdriver/provider-icons/assets/`. A retired upstream mark remains in the
catalogue so consumers can continue using it. New branding can use a new ID when
its identity changes. Artwork corrections can change SVG bytes; pin a full package
version and its archive digest if you need immutable artwork.

The public entrypoints are the package root, `/svg`, `/dom`, `/react`,
`/manifest.json` and `/assets/*`, with their documented functions, types and
component props. Direct imports into other implementation files are not covered
by this contract. Documented version-pinned CDN module URLs remain available.

Colour requests fall back to monochrome within the selected artwork. Unknown
providers, unavailable artwork and unrelated alternatives return `undefined`
from lookup/SVG/DOM helpers; the dynamic React component renders nothing.
Mounting an unavailable icon leaves the target unchanged. See the
[API reference](api.md) for these behaviors and accessibility guidance.

Catalogue metadata is deeply readonly at runtime and in TypeScript. Search
returns a fresh array of readonly entries; lookup results are independent copies.
Display names, palettes, localized search terms, category assignments and search
rankings may be corrected without changing icon identity. They are discovery
content, not stable identifiers or a model/provider support matrix.

## Manifest v1

`manifest.json` contains a numeric `version` (schema version, currently `1`), a
`packageVersion` string, an `icons` object keyed by stable ID and an `aliases`
object mapping aliases to IDs. These fields and their types remain available.

Each icon has `name` and `monochrome` strings, and `alternatives`, `searchTerms`
and `colourTheme` arrays of strings. Optional fields are `color`, `fullName`,
`primaryColour`, `category`, `upstreamUrl` and `artworks`. Category values are
`model`, `provider` or `application`. Artwork keys are `brand`, `text` or
`text-cn`, each with a required `monochrome` filename and optional `color` filename.
File paths are relative to `assets/` in the package, or the target directory when
using the vendor helper. Consumers must tolerate additional fields and icon IDs.

The repository checks a committed public API baseline, manifest field shapes,
TypeScript examples, rendering behavior and source provenance on every change.
Source synchronization does not regenerate the compatibility baseline.

## Supported environments

| Environment | Support and verification |
| --- | --- |
| Node.js | Node 22 and 24; both run the complete suite and packed consumer checks in CI |
| React | React 18.3.1 and React 19; packed server rendering is checked on both, with DOM/hydration tests on 19 |
| TypeScript | TypeScript 5.9, strict mode and ESM/bundler resolution; declarations ship in the package |
| Browser | ESM and ES2022 APIs; DOM helpers need an SVG-capable document. Chromium smoke checks supplement the automated DOM tests |
| Native applications | SVG and JSON assets have no JavaScript runtime requirement; the vendor helper requires Python 3.10+ and is checked on 3.10/3.12, including optimized mode |

The core has no runtime dependencies; React is an optional peer used only by
`/react`. The package is ESM-only. The JavaScript modules use no runtime network
or filesystem access. GJS can import the core and SVG modules; release smoke
checks cover GJS 1.88. Frameworks using React Server Components should import the
React icons from a client component, as shown in the [React guide](api.md#react).

Bun and Deno can consume the npm package, but are not separate CI targets.
Firefox and Safari are not currently separate browser automation targets.
Prereleases use the opt-in `alpha` channel; normal installs use stable `latest`.
