# Changelog

## 1.0.0 — 2026-09-29

First stable release: 380 AI provider and product marks, comprising 1,041 original
SVG assets with monochrome, colour, wordmark and brand variants.

- Stable core, SVG, DOM and React APIs, with named React imports, accessible DOM
  helpers, localized search, categories, aliases and source-defined palettes.
- A documented [1.x compatibility policy](docs/stability.md) and automated checks
  protecting public IDs, aliases, exports, component members, asset paths and
  manifest fields during upstream updates.
- Deeply readonly catalogue entries and TypeScript declarations. Attempts to
  mutate nested artwork or alternatives can no longer alter subsequent rendering.
- Native archive validation remains active under `python -O` and
  `PYTHONOPTIMIZE=1`. Validation also rejects flattened path collisions, unsafe
  archive entries, oversized contents and target symlinks before writing files.
- CI for Node 22/24 and Python 3.10/3.12, plus packed consumers using React
  18.3.1 and 19. Releases use npm trusted publishing with provenance and identical
  checksum-verified GitHub archives.
- Stable installation examples and an npm version badge that updates automatically.

### Upgrading from alpha

Run `npm install @agenticdriver/provider-icons@latest` and commit the lockfile.
Existing icon IDs, imports and SVG paths are preserved. If your app modified
`providerIcons` or search-result metadata, copy those values first; nested
catalogue data is now frozen and its declarations are readonly. Fresh resolution
results remain mutable. CDN and native consumers should pin `1.0.0` and use the
matching `SHA256SUMS` from its GitHub release.

## 0.1.0-alpha.7

Established the verified npm/GitHub release pipeline and trusted publishing.
Earlier alpha development introduced the full LobeHub catalogue, reviewed upstream
contributions, React/DOM helpers, colour metadata and discovery APIs. See the
[alpha release](https://github.com/agenticdriver/provider-icons/releases/tag/v0.1.0-alpha.7).
